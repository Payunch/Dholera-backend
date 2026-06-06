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

// GET user's unlocked PDFs
router.get('/my-vault', async (req, res) => {
  try {
    let leadToken = req.headers.authorization || req.query.token || '';
    if (leadToken.toLowerCase().startsWith('bearer ')) {
      leadToken = leadToken.slice(7).trim();
    }

    if (!leadToken) return res.status(401).json({ error: 'Token required' });

    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // If Pro, they have access to everything
    if (lead.is_pro) {
       const allPdfs = await PdfDocument.findAll({
         attributes: ['id', 'title', 'category', 'createdAt', 'documentDate'],
         order: [['id', 'ASC']]
       });
       return res.json(allPdfs.map(p => ({ ...p.toJSON(), unlocked: true })));
    }

    const purchases = await PdfPurchase.findAll({
      where: { lead_id: lead.id, status: 'completed' },
      attributes: ['pdf_id']
    });

    const unlockedIds = purchases.map(p => p.pdf_id);
    
    // If they have PRO_ACCESS (pdf_id: 0), they see everything
    if (unlockedIds.includes(0)) {
       const allPdfs = await PdfDocument.findAll({
         attributes: ['id', 'title', 'category', 'createdAt', 'documentDate'],
         order: [['id', 'ASC']]
       });
       return res.json(allPdfs.map(p => ({ ...p.toJSON(), unlocked: true })));
    }

    // Always include the free trial PDF
    const freeTrialId = parseInt(process.env.FREE_TRIAL_PDF_ID || '19', 10);
    if (!unlockedIds.includes(freeTrialId)) {
      unlockedIds.push(freeTrialId);
    }

    const pdfs = await PdfDocument.findAll({
      where: { id: { [Op.in]: unlockedIds } },
      attributes: ['id', 'title', 'category', 'createdAt', 'documentDate'],
      order: [['id', 'ASC']]
    });

    res.json(pdfs.map(p => ({ ...p.toJSON(), unlocked: true })));
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
            // Serve a beautiful Manual UPI Checkout Page
            const leadName = lead.name || 'Guest';
            const leadPhone = lead.phone || '';
            const upiId = process.env.ADMIN_UPI_ID || 'solankiparesh1183@okaxis';
            const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE || '917435808310';

            return res.status(200).send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Unlock Document - Dholera Platform</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                  body { font-family: 'Inter', sans-serif; background: #020617; color: white; }
                  .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
                  .btn-orange { background: #ea580c; transition: all 0.3s; }
                  .btn-orange:hover { background: #c2410c; transform: translateY(-2px); }
                  .btn-green { background: #22c55e; transition: all 0.3s; }
                  .btn-green:hover { background: #16a34a; transform: translateY(-2px); }
                </style>
              </head>
              <body class="min-h-screen flex items-center justify-center p-6">
                <div class="max-w-md w-full glass rounded-[2.5rem] p-10 text-center shadow-2xl">
                  <div class="h-20 w-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-orange-500/20">
                    <svg class="h-10 w-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  
                  <h1 class="text-3xl font-black uppercase tracking-tight mb-4">Premium Document</h1>
                  <p class="text-slate-400 font-medium text-sm leading-relaxed mb-8">
                    To unlock this official DSIRDA document, please complete a small maintenance payment.
                  </p>

                  <div class="space-y-6">
                    <!-- UPI Selection -->
                    <div class="grid grid-cols-2 gap-4">
                      <button onclick="selectOption(5, 'view')" id="btn-view" class="p-4 glass rounded-2xl border-2 border-orange-500 shadow-lg transition-all text-left">
                        <span class="block text-[10px] font-black text-orange-500 uppercase mb-1">View Access</span>
                        <span class="text-2xl font-black italic">₹5</span>
                      </button>
                      <button onclick="selectOption(10, 'download')" id="btn-download" class="p-4 glass rounded-2xl border-2 border-transparent transition-all text-left hover:border-white/10">
                        <span class="block text-[10px] font-black text-slate-500 uppercase mb-1">Download PDF</span>
                        <span class="text-2xl font-black italic">₹10</span>
                      </button>
                    </div>

                    <div class="p-6 glass rounded-3xl border border-white/10 space-y-4">
                       <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest">Click below to pay via UPI</p>
                       <a id="upi-link" href="upi://pay?pa=${upiId}&pn=Dholera%20Platform&am=5.00&cu=INR&tn=PDF%20Unlock%20${pdf.id}" 
                          class="block w-full btn-orange py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                         <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                         Pay <span id="display-amount">₹5</span> with UPI App
                       </a>
                       <p class="text-[9px] font-bold text-slate-600">${upiId}</p>
                    </div>

                  </div>

                  <button onclick="window.location.reload()" class="mt-8 text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest">I have Paid (Refresh Page)</button>
                </div>

                <script>
                  var currentType = 'view';
                  var currentAmount = 5;

                  function selectOption(amt, type) {
                    currentAmount = amt;
                    currentType = type;
                    
                    // Update UI Colors and Borders
                    var btnView = document.getElementById('btn-view');
                    var btnDownload = document.getElementById('btn-download');
                    var displayAmt = document.getElementById('display-amount');
                    
                    if (type === 'view') {
                      btnView.style.borderColor = '#ea580c';
                      btnView.classList.add('shadow-lg');
                      btnDownload.style.borderColor = 'transparent';
                      btnDownload.classList.remove('shadow-lg');
                    } else {
                      btnDownload.style.borderColor = '#ea580c';
                      btnDownload.classList.add('shadow-lg');
                      btnView.style.borderColor = 'transparent';
                      btnView.classList.remove('shadow-lg');
                    }
                    
                    displayAmt.innerText = '₹' + amt;
                    
                    // Update Links (Using simple string concatenation for reliability)
                    var upiBase = "upi://pay?pa=" + "${upiId}" + "&pn=Dholera%20Platform&am=" + amt + ".00&cu=INR&tn=PDF%20Unlock%20" + "${pdf.id}" + "_" + type;
                    var waBase = "https://wa.me/" + "${adminPhone}" + "?text=Paid%20Rs." + amt + "%20for%20" + type.toUpperCase() + "%20access%20to%20PDF%20ID:%20" + "${pdf.id}" + ".%20Please%20activate.";
                    
                    document.getElementById('upi-link').href = upiBase;
                    document.getElementById('wa-link').href = waBase;
                  }
                </script>
              </body>
              </html>
            `);
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
