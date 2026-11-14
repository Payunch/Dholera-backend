/**
 * Automated Site Health & SEO Auditor for DholeraPlatform
 * Replaces paid tools by directly crawling pages, checking HTTP health,
 * evaluating on-page metadata, image alt tags, canonical tags, and GEO readiness.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.dholeraplatform.com';

function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'DholeraSeoAuditor/1.0' } }, (res) => {
      // Follow 301/302/307/308 redirects
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        let redirectTarget = res.headers.location;
        if (!redirectTarget.startsWith('http')) {
          redirectTarget = `${BASE_URL}${redirectTarget}`;
        }
        return fetchUrl(redirectTarget, maxRedirects - 1).then((redirectedResp) => {
          resolve({
            ...redirectedResp,
            redirectFrom: url,
            redirectCode: res.statusCode,
            latencyMs: Date.now() - startTime
          });
        });
      }

      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          latencyMs: Date.now() - startTime,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        url,
        statusCode: 0,
        latencyMs: Date.now() - startTime,
        error: err.message,
        body: ''
      });
    });
    req.setTimeout(12000, () => {
      req.destroy();
      resolve({
        url,
        statusCode: 408,
        latencyMs: 12000,
        error: 'Timeout',
        body: ''
      });
    });
  });
}

function parsePageHtml(html, url) {
  const issues = [];
  
  // Title tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (!title) {
    issues.push({ severity: 'CRITICAL', msg: 'Missing <title> tag' });
  } else if (title.length < 30 || title.length > 70) {
    issues.push({ severity: 'WARNING', msg: `Title length suboptimal (${title.length} chars, ideal 45–65)` });
  }

  // Meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';
  if (!metaDesc) {
    issues.push({ severity: 'HIGH', msg: 'Missing meta description' });
  } else if (metaDesc.length < 100 || metaDesc.length > 175) {
    issues.push({ severity: 'WARNING', msg: `Meta description length (${metaDesc.length} chars, ideal 135–165)` });
  }

  // Canonical tag
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';
  if (!canonical) {
    issues.push({ severity: 'MEDIUM', msg: 'Missing canonical URL link' });
  }

  // H1 tag count
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    issues.push({ severity: 'HIGH', msg: 'Missing <h1> tag' });
  } else if (h1Matches.length > 1) {
    issues.push({ severity: 'LOW', msg: `Multiple <h1> tags found (${h1Matches.length})` });
  }

  // Images without alt
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  let missingAltCount = 0;
  for (const img of imgMatches) {
    if (!/alt=["'][^"']*["']/i.test(img)) {
      missingAltCount++;
    }
  }
  if (missingAltCount > 0) {
    issues.push({ severity: 'MEDIUM', msg: `${missingAltCount} image(s) missing alt attribute` });
  }

  // Structured Data (JSON-LD)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const hasJsonLd = jsonLdMatches.length > 0;
  if (!hasJsonLd) {
    issues.push({ severity: 'LOW', msg: 'No Schema.org JSON-LD structured data detected' });
  }

  return {
    title,
    metaDesc,
    canonical,
    h1Count: h1Matches.length,
    imgCount: imgMatches.length,
    missingAltCount,
    hasJsonLd,
    issues
  };
}

async function runAudit() {
  console.log('====================================================');
  console.log('   DHOLERAPLATFORM AUTOMATED SITE & SEO AUDITOR    ');
  console.log('====================================================\n');

  // Core URLs to inspect
  const coreUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/tp-maps`,
    `${BASE_URL}/projects`,
    `${BASE_URL}/infrastructure`,
    `${BASE_URL}/investment-guide`,
    `${BASE_URL}/invest`,
    `${BASE_URL}/blogs`,
    `${BASE_URL}/robots.txt`,
    `${BASE_URL}/llms.txt`,
    `${BASE_URL}/llms-full.txt`,
  ];

  // Fetch recent flagship blog slugs from local / production DB
  let blogUrls = [];
  try {
    const { Update } = require('../models');
    const recentPosts = await Update.findAll({
      where: { published: true },
      order: [['publishedAt', 'DESC']],
      limit: 15
    });
    blogUrls = recentPosts.map(p => `${BASE_URL}/blogs/${p.slug}`);
    console.log(`[Audit] Ingested ${blogUrls.length} recent flagship blog URLs from database.`);
  } catch (err) {
    console.warn('[Audit] Database load fallback:', err.message);
  }

  const allUrls = [...coreUrls, ...blogUrls];
  console.log(`[Audit] Starting crawl of ${allUrls.length} key URLs...\n`);

  const results = [];
  for (const url of allUrls) {
    process.stdout.write(`Scanning ${url.replace(BASE_URL, '') || '/'}... `);
    const resp = await fetchUrl(url);
    if (resp.statusCode === 200) {
      if (url.endsWith('.txt')) {
        console.log(`[200 OK] (Plain text: ${resp.body.length} bytes)`);
        results.push({ url, statusCode: 200, latencyMs: resp.latencyMs, isText: true, size: resp.body.length, issues: [] });
      } else {
        const analysis = parsePageHtml(resp.body, url);
        console.log(`[200 OK] (${resp.latencyMs}ms) - ${analysis.issues.length} issue(s)`);
        results.push({ url, statusCode: 200, latencyMs: resp.latencyMs, isText: false, ...analysis });
      }
    } else {
      console.log(`[${resp.statusCode || 'ERR'}] ${resp.error || ''}`);
      results.push({
        url,
        statusCode: resp.statusCode,
        latencyMs: resp.latencyMs,
        issues: [{ severity: 'CRITICAL', msg: `HTTP ${resp.statusCode}: ${resp.error || 'Page unreachable'}` }]
      });
    }
  }

  // Generate AUDIT-REPORT.md
  console.log('\n--- COMPILING AUDIT-REPORT.md ---');
  let criticalCount = 0;
  let warningCount = 0;

  const doToday = [];
  const doThisWeek = [];
  const doLater = [];

  for (const r of results) {
    for (const issue of r.issues || []) {
      const item = { url: r.url, ...issue };
      if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
        criticalCount++;
        doToday.push(item);
      } else if (issue.severity === 'MEDIUM') {
        warningCount++;
        doThisWeek.push(item);
      } else {
        doLater.push(item);
      }
    }
  }

  const avgLatency = Math.round(results.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / results.length);
  const healthScore = Math.max(0, 100 - (criticalCount * 15) - (warningCount * 3));

  let md = `# DholeraPlatform Site Health & SEO Audit Report
*Generated on: ${new Date().toISOString()}*
*Overall Site Health Score: **${healthScore}/100*** | *Average Response Latency: **${avgLatency}ms***

---

## Executive Summary
- **Total URLs Audited:** ${results.length}
- **Critical / High Issues:** ${criticalCount}
- **Medium Warnings:** ${warningCount}
- **Average Server Latency:** ${avgLatency}ms
- **GEO llms.txt Status:** ${results.find(r => r.url.endsWith('llms.txt'))?.statusCode === 200 ? '✅ Live & Accessible' : '⏳ Pending Deployment'}
- **Robots.txt Status:** ${results.find(r => r.url.endsWith('robots.txt'))?.statusCode === 200 ? '✅ Valid' : '❌ Broken'}

---

## Action Plan: Priority Breakdown

### 🚨 1. Do Today (Immediate Fixes)
${doToday.length === 0 ? '*No critical issues found! All tested pages responded with 200 OK and core tags intact.*' : doToday.map(i => `- **[${i.severity}]** \`${i.url.replace(BASE_URL, '') || '/'}\`: ${i.msg}`).join('\n')}

### ⚠️ 2. Do This Week (Optimizations)
${doThisWeek.length === 0 ? '*No medium warnings detected.*' : doThisWeek.map(i => `- \`${i.url.replace(BASE_URL, '') || '/'}\`: ${i.msg}`).join('\n')}

### 💡 3. Do Later (Enhancements)
${doLater.length === 0 ? '*No low-priority enhancements.*' : doLater.map(i => `- \`${i.url.replace(BASE_URL, '') || '/'}\`: ${i.msg}`).join('\n')}

---

## Page-by-Page Diagnostic Table

| Page Path | Status | Latency | Title Length | H1 Count | Structured Data | Issues |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
${results.map(r => {
  const pathPart = r.url.replace(BASE_URL, '') || '/';
  if (r.isText) {
    return `| \`${pathPart}\` | \`${r.statusCode}\` | ${r.latencyMs}ms | N/A (Text) | N/A | N/A | None |`;
  }
  return `| \`${pathPart.length > 40 ? pathPart.slice(0, 37) + '...' : pathPart}\` | \`${r.statusCode}\` | ${r.latencyMs}ms | ${r.title ? r.title.length + ' chars' : '0'} | ${r.h1Count || 0} | ${r.hasJsonLd ? '✅' : '❌'} | ${r.issues ? r.issues.length : 0} |`;
}).join('\n')}

---
*Report generated by Dholera Internal SEO Auditor (100% Free Open-Source Tool).*
`;

  const reportPath = path.join(__dirname, '..', 'AUDIT-REPORT.md');
  fs.writeFileSync(reportPath, md);
  console.log(`[✓] Audit complete! Report saved to ${reportPath}\n`);
  console.log(`Health Score: ${healthScore} / 100`);
  console.log(`Critical: ${criticalCount} | Warnings: ${warningCount} | Avg Latency: ${avgLatency}ms`);
}

runAudit().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});

