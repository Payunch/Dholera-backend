const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PdfDocument, PdfView, Lead, PdfPurchase } = require('../models');
const { verifyAccessToken, getTokenFromRequest } = require('../services/adminSecurity');
const { cloudinary } = require('../services/cloudinary');
const { verifyToken } = require('./auth');
const upload = require('../middleware/upload');

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
        
        // Allow redirects from api.cloudinary.com to res.cloudinary.com during authenticated download
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

// POST upload a new PDF (Admin)
router.post('/upload', verifyToken, upload.single('pdf'), async (req, res) => {
  try {
    const { title, category } = req.body;
    const isProtected = req.body.is_protected === undefined
      ? true
      : ['true', true, '1', 1].includes(req.body.is_protected);
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // Save relative path for local storage so static server can find it
    let filePath = req.file.secure_url || req.file.path;
    if (!isRemotePdfPath(filePath)) {
      // Convert absolute path to relative for static serving
      // req.file.path is usually .../uploads/pdfs/filename.pdf
      // We want /uploads/pdfs/filename.pdf
      const uploadsBase = path.resolve(__dirname, '..');
      filePath = '/' + path.relative(uploadsBase, filePath).replace(/\\/g, '/');
    }

    const pdf = await PdfDocument.create({
      title: title.trim(),
      category: category ? category.trim() : 'General',
      file_path: filePath,
      is_protected: isProtected
    });

    res.status(201).json(pdf);
  } catch (err) {
    console.error('Error uploading PDF:', err);
    res.status(400).json({ error: err.message || 'Failed to upload PDF' });
  }
});

// GET secure PDF stream
router.get('/view/:id', async (req, res) => {
  try {
    // 1. Check if the user is an Admin first (Super-Power)
    let isAdmin = false;
    if (req.session?.isAdmin) {
      isAdmin = true;
    } else {
      const accessToken = getTokenFromRequest(req, 'admin_access_token');
      if (accessToken) {
        try {
          const payload = verifyAccessToken(accessToken);
          if (payload?.sub) isAdmin = true;
        } catch (e) {
          // Token invalid, ignore and check lead token
        }
      }
    }

    let lead = null;
    if (!isAdmin) {
      // 2. If not admin, verify Lead Token
      let leadToken = req.headers.authorization || req.query.token || '';
      if (!leadToken) {
        return res.status(403).json({ error: 'Verification required to view this document.' });
      }
      if (leadToken.toLowerCase().startsWith('bearer ')) {
        leadToken = leadToken.slice(7).trim();
      }

      lead = await Lead.findOne({ where: { lead_token: leadToken } });
      if (!lead || !lead.verified) {
        return res.status(403).json({ error: 'Invalid or unverified lead token.' });
      }
    }

    const pdf = await PdfDocument.findByPk(req.params.id);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found.' });
    }

    // 3. Enforce Payment for Protected Documents
    if (!isAdmin && pdf.is_protected) {
      const purchase = await PdfPurchase.findOne({
        where: { lead_id: lead.id, pdf_id: pdf.id, status: 'completed' }
      });

      if (!purchase) {
        return res.status(402).json({ 
          error: 'Payment required to view this document.',
          requiresPayment: true,
          amount: 10,
          currency: 'INR'
        });
      }
    }

    // Record view only for leads, not for admins
    if (lead) {
      try {
        await PdfView.create({ lead_id: lead.id, pdf_id: pdf.id });
        const viewCount = await PdfView.count({ where: { lead_id: lead.id } });
        if (viewCount > 1 && !lead.returning_visitor) {
          await lead.update({ returning_visitor: true });
        }
      } catch (viewErr) {
        console.error('Error recording PDF view:', viewErr.message);
      }
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

      let streamUrl = filePath;

      // If it's Cloudinary, use an authenticated download URL
      try {
        const parsed = new URL(filePath);
        if (parsed.hostname === 'res.cloudinary.com') {
          // Extract info from path: /<cloud_name>/<res_type>/<type>/v<ver>/<public_id>
          const parts = parsed.pathname.split('/');
          const uploadIndex = parts.indexOf('upload');
          const authenticatedIndex = parts.indexOf('authenticated');
          const typeIndex = uploadIndex !== -1 ? uploadIndex : authenticatedIndex;
          
          if (typeIndex !== -1) {
            const resourceType = parts[typeIndex - 1] || 'raw';
            const type = parts[typeIndex];
            let publicIdParts = parts.slice(typeIndex + 1);
            
            // Skip version segment
            if (publicIdParts[0].startsWith('v') && /^\d+$/.test(publicIdParts[0].slice(1))) {
              publicIdParts = publicIdParts.slice(1);
            }
            
            const fullPublicId = publicIdParts.join('/');
            // Extract extension if present for 'raw' downloads
            const extMatch = fullPublicId.match(/\.([a-z0-9]+)$/i);
            const format = extMatch ? extMatch[1] : 'pdf';
            const publicId = extMatch ? fullPublicId.slice(0, -extMatch[0].length) : fullPublicId;

            // Generate a private download URL that uses the API Secret
            streamUrl = cloudinary.utils.private_download_url(publicId, format, {
              resource_type: resourceType,
              type: type
            });
            // console.log('[PDF] Generated private download URL for:', publicId);
          }
        }
      } catch (signErr) {
        console.warn('Authenticated URL generation failed, falling back to original:', signErr.message);
      }

      try {
        await pipeRemoteUrl(streamUrl, res);
      } catch (err) {
        console.error('Remote PDF pipe error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Failed to stream document from storage.' });
        }
      }
      return;
    }

    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const resolved = path.resolve(__dirname, '..', filePath.startsWith('/') ? filePath.substring(1) : filePath);

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
