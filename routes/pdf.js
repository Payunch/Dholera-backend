const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PdfDocument, PdfView, Lead, PdfPurchase } = require('../models');
const { Op } = require('sequelize');
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
      attributes: ['id', 'title', 'category', 'createdAt', 'documentDate']
    });
    res.json(pdfs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export all PDF metadata (Admin)
router.get('/export', verifyToken, async (req, res) => {
  try {
    const pdfs = await PdfDocument.findAll();
    res.json(pdfs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST sync from disk (Admin) - scans a specific directory or uploads
router.post('/sync-disk', verifyToken, async (req, res) => {
  try {
    // Scan the 'uploads' directory
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).json({ error: 'Uploads directory not found.' });
    }

    const files = fs.readdirSync(uploadsDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    let addedCount = 0;
    let updatedCount = 0;

    for (const fileName of pdfFiles) {
      const fullPath = path.join(uploadsDir, fileName);
      const stats = fs.statSync(fullPath);
      const fileMtime = stats.mtime;

      const filePath = `/uploads/${fileName}`;
      const title = fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
      
      const [record, created] = await PdfDocument.findOrCreate({
        where: { file_path: filePath },
        defaults: {
          title: title,
          category: 'Discovered',
          is_protected: true,
          documentDate: fileMtime // Use actual file date for new records
        }
      });

      if (created) {
        addedCount++;
      } else {
        // If it already exists but doesn't have a documentDate, update it
        if (!record.documentDate) {
          await record.update({ documentDate: fileMtime });
          updatedCount++;
        }
      }
    }

    res.json({ success: true, added: addedCount, updated: updatedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST import PDF metadata (Admin)
router.post('/import', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Import data must be an array.' });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of data) {
      if (!item.title || !item.file_path) continue;

      const [record, created] = await PdfDocument.findOrCreate({
        where: { title: item.title },
        defaults: {
          category: item.category || 'General',
          file_path: item.file_path,
          is_protected: item.is_protected !== undefined ? item.is_protected : true,
          documentDate: item.documentDate || null
        }
      });

      if (!created) {
        await record.update({
          category: item.category || record.category,
          file_path: item.file_path || record.file_path,
          is_protected: item.is_protected !== undefined ? item.is_protected : record.is_protected,
          documentDate: item.documentDate || record.documentDate
        });
        updatedCount++;
      } else {
        createdCount++;
      }
    }

    res.json({ success: true, created: createdCount, updated: updatedCount });
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
      // 3.0 Pro Access Check (Unlock All)
      if (lead.is_pro) {
        console.log(`[PDF] Lead ${lead.id} is PRO. Access Granted.`);
      } 
      else {
        // 3.1 Check for any relevant purchase records (Specific PDF OR Pro Access)
        const targetPdfId = parseInt(pdf.id, 10);
        
        console.log(`[PDF] Checking access for Lead ${lead.id} on PDF ${targetPdfId}`);

        const purchase = await PdfPurchase.findOne({
          where: { 
            lead_id: lead.id, 
            pdf_id: { [Op.in]: [targetPdfId, 0] }, // 0 is PRO_ACCESS
            status: { [Op.in]: ['completed', 'awaiting_approval'] }
          },
          order: [
            [sequelize.literal("CASE WHEN status = 'completed' THEN 1 ELSE 2 END"), 'ASC'],
            ['updatedAt', 'DESC']
          ]
        });

        if (purchase) {
          console.log(`[PDF] Lead ${lead.id} match: ${purchase.status}`);
          if (purchase.status === 'completed') {
            // Access granted
          } else if (purchase.status === 'awaiting_approval') {
            return res.status(402).json({ 
              error: 'Payment Awaiting Approval',
              status: 'awaiting_approval',
              message: 'Your payment details are being verified by the Admin.',
              leadId: lead.id
            });
          }
        }
        else {
          console.log(`[PDF] No active purchase found for Lead ${lead.id} on PDF ${targetPdfId}`);
          
          // 3.2 THE "ONLY ONE TEST PDF IS FREE" RULE
          const freeTrialId = parseInt(process.env.FREE_TRIAL_PDF_ID || '19', 10);
          const isTrialDocument = targetPdfId === freeTrialId;

          if (isTrialDocument) {
            console.log(`[PDF] PDF ${freeTrialId} is free trial. Access Granted.`);
          } else {
            return res.status(402).json({ 
              error: 'Premium Document',
              requiresPayment: true,
              amount: 10, 
              currency: 'INR',
              message: 'This is a premium document. You can unlock it individually or get Pro access for all documents.',
              leadId: lead.id
            });
          }
        }
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
