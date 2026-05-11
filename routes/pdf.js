const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PdfDocument, PdfView, Lead } = require('../models');

const ALLOWED_REMOTE_PDF_HOSTS = new Set(['res.cloudinary.com']);

const isRemotePdfPath = (value = '') => /^https?:\/\//i.test(String(value).trim());

const isAllowedRemotePdfUrl = (value = '') => {
  try {
    const parsed = new URL(String(value).trim());
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      ALLOWED_REMOTE_PDF_HOSTS.has(parsed.hostname)
    );
  } catch (err) {
    return false;
  }
};

const isPathInsideDir = (rootDir, targetPath) => {
  const relative = path.relative(rootDir, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
};

function pipeRemoteUrl(remoteUrl, res, redirectDepth = 0) {
  if (redirectDepth > 5) {
    return Promise.reject(new Error('Remote PDF redirected too many times.'));
  }

  return new Promise((resolve, reject) => {
    const proto = remoteUrl.startsWith('https://') ? https : http;
    const request = proto.get(remoteUrl, (upstream) => {
      const statusCode = upstream.statusCode || 500;
      const redirectLocation = upstream.headers.location;

      if (statusCode >= 300 && statusCode < 400 && redirectLocation) {
        upstream.resume();
        const nextUrl = new URL(redirectLocation, remoteUrl).toString();
        if (!isAllowedRemotePdfUrl(nextUrl)) {
          reject(new Error('Remote PDF redirect target is not allowed.'));
          return;
        }
        pipeRemoteUrl(nextUrl, res, redirectDepth + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode >= 400) {
        upstream.resume();
        reject(new Error(`Remote PDF returned ${statusCode}`));
        return;
      }

      res.status(200);
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/pdf');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

      if (upstream.headers['content-length']) {
        res.setHeader('Content-Length', upstream.headers['content-length']);
      }

      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', reject);
    });

    request.setTimeout(15000, () => {
      request.destroy(new Error('Remote PDF request timed out.'));
    });

    request.on('error', reject);
  });
}

// GET list of PDFs
router.get('/list', async (req, res) => {
  try {
    const pdfs = await PdfDocument.findAll({
      attributes: ['id', 'title', 'category']
    });
    res.json(pdfs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET secure PDF stream
router.get('/view/:id', async (req, res) => {
  try {
    let leadToken = req.headers.authorization || req.query.token || '';
    if (!leadToken) {
      return res.status(403).json({ error: 'Verification required to view this document.' });
    }
    if (leadToken.toLowerCase().startsWith('bearer ')) {
      leadToken = leadToken.slice(7).trim();
    }

    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead || !lead.verified) {
      return res.status(403).json({ error: 'Invalid or unverified lead token.' });
    }

    const pdf = await PdfDocument.findByPk(req.params.id);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found.' });
    }

    try {
      await PdfView.create({ lead_id: lead.id, pdf_id: pdf.id });
    } catch (viewErr) {
      console.error('Error recording PDF view:', viewErr.message);
    }

    const viewCount = await PdfView.count({ where: { lead_id: lead.id } });
    if (viewCount > 1 && !lead.returning_visitor) {
      await lead.update({ returning_visitor: true });
    }

    const filePath = String(pdf.file_path || '').trim();
    if (!filePath) {
      return res.status(500).json({ error: 'Document path is not configured.' });
    }

    if (isRemotePdfPath(filePath)) {
      if (!isAllowedRemotePdfUrl(filePath)) {
        console.error('Blocked remote PDF host:', filePath);
        return res.status(400).json({ error: 'Invalid remote document path.' });
      }

      try {
        await pipeRemoteUrl(filePath, res);
      } catch (err) {
        console.error('Remote PDF pipe error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Failed to stream document from storage.' });
        }
      }
      return;
    }

    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const resolved = path.resolve(__dirname, '..', filePath);

    if (!isPathInsideDir(uploadsDir, resolved)) {
      console.error('Attempted access outside uploads dir:', resolved);
      return res.status(400).json({ error: 'Invalid document path.' });
    }

    if (!fs.existsSync(resolved)) {
      console.error('File not found at path:', resolved);
      return res.status(404).json({ error: 'Document file missing on server.' });
    }

    res.sendFile(resolved, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private'
      }
    });
  } catch (err) {
    console.error('PDF View Error:', err);
    res.status(500).json({ error: 'Internal server error while loading document.' });
  }
});

module.exports = router;
