const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PdfDocument, PdfView, Lead, PdfPurchase, sequelize } = require('../models');
const { Op } = require('sequelize');
const { verifyAccessToken, getTokenFromRequest } = require('../services/adminSecurity');
const { cloudinary } = require('../services/cloudinary');
const { verifyToken } = require('./auth');
const upload = require('../middleware/upload');
const { appCheckVerification } = require('../middleware/appCheckMiddleware');

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
        
        const parsedNext = new URL(nextUrl);
        if (parsedNext.hostname !== 'res.cloudinary.com' && !isAllowedRemotePdfUrl(nextUrl)) {
          reject(new Error('Remote PDF redirect target is not allowed.'));
          return;
        }
        pipeRemoteUrl(nextUrl, res, redirectDepth + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode >= 400) {
        upstream.resume();
        console.error(`[PDF] Remote Fetch Failed: ${statusCode} for URL: ${remoteUrl.substring(0, 100)}...`);
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
      attributes: ['id', 'title', 'category', 'createdAt', 'documentDate'],
      order: [['id', 'ASC']]
    });
    res.json(pdfs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET secure PDF stream
router.get('/view/:id', appCheckVerification, async (req, res) => {
  try {
    // 1. Authenticate (Admin or Verified Lead)
    let isAdmin = false;
    if (req.session?.isAdmin) {
      isAdmin = true;
    } else {
      const accessToken = getTokenFromRequest(req, 'admin_access_token');
      if (accessToken) {
        try {
          const payload = verifyAccessToken(accessToken);
          if (payload?.sub) isAdmin = true;
        } catch (e) {}
      }
    }

    let lead = null;
    if (!isAdmin) {
      let leadToken = req.headers.authorization || req.query.token || '';
      if (leadToken.toLowerCase().startsWith('bearer ')) {
        leadToken = leadToken.slice(7).trim();
      }

      if (leadToken) {
        lead = await Lead.findOne({ where: { lead_token: leadToken } });
      }
      
      // If no token and it's not a trial, block it early
      const freeTrialId = process.env.FREE_TRIAL_PDF_ID || '19';
      if (!lead && String(req.params.id) !== String(freeTrialId)) {
        return res.status(403).json({ error: 'Verification required to view this document.' });
      }
    }

    const pdf = await PdfDocument.findByPk(req.params.id);
    if (!pdf) return res.status(404).json({ error: 'PDF not found.' });

    // 2. Authorization (Payment check)
    if (!isAdmin && pdf.is_protected) {
      const freeTrialId = process.env.FREE_TRIAL_PDF_ID || '19';
      const isTrial = String(pdf.id) === String(freeTrialId);

      if (!isTrial) {
        if (!lead || !lead.verified) return res.status(403).json({ error: 'Invalid or unverified lead token.' });
        
        // CRITICAL CHECK: Lead.is_pro MUST be non-null and boolean
        if (lead.is_pro !== true) {
          const purchase = await PdfPurchase.findOne({
            where: { 
              lead_id: lead.id, 
              pdf_id: { [Op.in]: [pdf.id, 0] }, // 0 is PRO_ACCESS
              status: 'completed'
            },
            order: [['updatedAt', 'DESC']]
          });

          if (!purchase) {
            return res.status(402).json({ 
              error: 'Premium Document',
              requiresPayment: true,
              message: 'Unlock this document or get Pro access.'
            });
          }
        }
      }
    }

    // 3. Document Streaming
    const filePath = String(pdf.file_path || '').trim();
    if (!filePath) return res.status(500).json({ error: 'Document path missing.' });

    if (isRemotePdfPath(filePath)) {
      if (!isAllowedRemotePdfUrl(filePath)) return res.status(400).json({ error: 'Blocked remote host.' });

      let streamUrl = filePath;

      // ROADMAP PHASE 6: SECURE CLOUDINARY SIGNING
      try {
        const parsed = new URL(filePath);
        if (parsed.hostname === 'res.cloudinary.com') {
          const parts = parsed.pathname.split('/');
          const uploadIndex = parts.indexOf('upload');
          const privateIndex = parts.indexOf('private');
          const authenticatedIndex = parts.indexOf('authenticated');
          const typeIndex = uploadIndex !== -1 ? uploadIndex : (privateIndex !== -1 ? privateIndex : authenticatedIndex);
          
          if (typeIndex !== -1) {
            let publicIdParts = parts.slice(typeIndex + 1);
            
            // Skip signature if present
            if (publicIdParts[0] && publicIdParts[0].startsWith('s--') && publicIdParts[0].endsWith('--')) {
              publicIdParts = publicIdParts.slice(1);
            }

            if (publicIdParts[0] && publicIdParts[0].startsWith('v') && /^\d+$/.test(publicIdParts[0].slice(1))) {
              publicIdParts = publicIdParts.slice(1);
            }
            
            const fullPublicId = publicIdParts.join('/');
            const extMatch = fullPublicId.match(/\.([a-z0-9]+)$/i);
            const format = extMatch ? extMatch[1] : 'pdf';
            const publicId = extMatch ? fullPublicId.slice(0, -extMatch[0].length) : fullPublicId;

            // USE STORED METADATA FOR PERFECT SIGNING
            streamUrl = cloudinary.utils.private_download_url(publicId, format, {
              resource_type: pdf.resource_type || 'image',
              type: pdf.storage_type || parts[typeIndex]
            });
          }
        }
      } catch (err) {
        console.warn('[PDF] Cloudinary signing failed:', err.message);
      }

      await pipeRemoteUrl(streamUrl, res);
      return;
    }

    // Local file streaming
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const resolved = path.resolve(__dirname, '..', filePath.startsWith('/') ? filePath.substring(1) : filePath);

    if (!isPathInsideDir(uploadsDir, resolved) || !fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File missing.' });
    }

    const stats = fs.statSync(resolved);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stats.size,
      'Cache-Control': 'no-store, private'
    });
    fs.createReadStream(resolved).pipe(res);

  } catch (err) {
    console.error('PDF View Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error.' });
  }
});

// Admin upload
router.post('/upload', verifyToken, upload.single('pdf'), async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !req.file) return res.status(400).json({ error: 'Title and PDF required.' });

    const filePath = req.file.secure_url || '/' + path.relative(path.resolve(__dirname, '..'), req.file.path).replace(/\\/g, '/');

    const pdf = await PdfDocument.create({
      title: title.trim(),
      category: category ? category.trim() : 'General',
      file_path: filePath,
      is_protected: true
    });

    res.status(201).json(pdf);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin sync-disk
router.post('/sync-disk', verifyToken, async (req, res) => {
  try {
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) return res.status(404).json({ error: 'Uploads missing.' });

    const files = fs.readdirSync(uploadsDir).filter(f => f.toLowerCase().endsWith('.pdf'));
    let added = 0;

    for (const fileName of files) {
      const filePath = `/uploads/${fileName}`;
      const [, created] = await PdfDocument.findOrCreate({
        where: { file_path: filePath },
        defaults: { title: fileName.replace(/\.pdf$/i, '').replace(/_/g, ' '), category: 'Discovered', is_protected: true }
      });
      if (created) added++;
    }

    res.json({ success: true, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
