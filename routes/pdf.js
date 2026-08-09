const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PdfDocument, PdfView, Lead, PdfPurchase, sequelize, AppUser } = require('../models');
const { Op } = require('sequelize');
const { verifyAccessToken, getTokenFromRequest } = require('../services/adminSecurity');
const { cloudinary } = require('../services/cloudinary');
const { verifyToken } = require('./auth');
const upload = require('../middleware/upload');
const { appCheckVerification } = require('../middleware/appCheckMiddleware');
const jwt = require('jsonwebtoken');
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');


const JWT_SECRET = process.env.JWT_SECRET;
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

function fetchRemotePdfBuffer(remoteUrl, redirectDepth = 0) {
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
        return fetchRemotePdfBuffer(nextUrl, redirectDepth + 1).then(resolve).catch(reject);
      }

      if (statusCode >= 400) {
        upstream.resume();
        reject(new Error(`Remote PDF returned ${statusCode}`));
        return;
      }

      const chunks = [];
      upstream.on('data', (chunk) => chunks.push(chunk));
      upstream.on('end', () => resolve(Buffer.concat(chunks)));
      upstream.on('error', reject);
    });

    request.setTimeout(15000, () => {
      request.destroy(new Error('Remote PDF request timed out.'));
    });

    request.on('error', reject);
  });
}

async function applyWatermarkToPdf(inputBuffer, userName = 'AUTHORIZED USER', userPhone = '') {
  try {
    const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const cleanName = String(userName || 'AUTHORIZED USER').trim().toUpperCase();
    const cleanPhone = String(userPhone || '').trim();

    const watermarkLine1 = cleanName;
    const watermarkLine2 = cleanPhone ? `USER NO: ${cleanPhone}` : '';

    for (const page of pages) {
      const { width, height } = page.getSize();

      const fontSize = Math.max(14, Math.min(width, height) * 0.035);
      const stepX = Math.max(220, width * 0.45);
      const stepY = Math.max(200, height * 0.4);

      for (let x = -width * 0.3; x < width * 1.4; x += stepX) {
        for (let y = -height * 0.3; y < height * 1.4; y += stepY) {
          page.drawText(watermarkLine1, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity: 0.18,
            rotate: degrees(35),
          });

          if (watermarkLine2) {
            page.drawText(watermarkLine2, {
              x: x - 10,
              y: y - (fontSize * 1.25),
              size: fontSize * 0.85,
              font,
              color: rgb(0.5, 0.5, 0.5),
              opacity: 0.18,
              rotate: degrees(35),
            });
          }
        }
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return Buffer.from(modifiedPdfBytes);
  } catch (err) {
    console.error('[PDF Watermark Error]:', err.message);
    return inputBuffer;
  }
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

    let isJwtVerified = false;
    if (leadToken && JWT_SECRET) {
      try {
        const payload = jwt.verify(leadToken, JWT_SECRET);
        if (payload?.role === 'user' || payload?.role === 'admin') {
          isJwtVerified = true;
        }
      } catch (_) {}
    }

    if (isJwtVerified || req.session?.isAdmin) {
      const allPdfs = await PdfDocument.findAll({
        attributes: ['id', 'title', 'category', 'createdAt', 'documentDate'],
        order: [['id', 'ASC']]
      });
      return res.json(allPdfs.map(p => ({ ...p.toJSON(), unlocked: true })));
    }

    const lead = leadToken ? await Lead.findOne({ where: { lead_token: leadToken } }) : null;
    if (!lead) {
      const publicPdfs = await PdfDocument.findAll({
        attributes: ['id', 'title', 'category', 'createdAt', 'documentDate'],
        order: [['id', 'ASC']]
      });
      return res.json(publicPdfs.map(p => ({ ...p.toJSON(), unlocked: true })));
    }

    // If session-verified or Pro, they have access to everything
    const isSessionVerified = (req.session && req.session.pdfVerified) || lead.is_pro;
    if (isSessionVerified) {
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

function serveOtpVerificationPage(req, res, pdf) {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBN6qClTk28er9L_AoQnko6M8weNp4bLZk",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "user-management-admin-1128f.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "user-management-admin-1128f",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "user-management-admin-1128f.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "536387058166",
    appId: process.env.FIREBASE_APP_ID || "1:536387058166:web:0fad3e8ce885fde06d2fd7"
  };

  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Verify Mobile - Dholera Platform</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #020617; color: white; }
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .btn-orange { background: #ea580c; transition: all 0.3s; }
        .btn-orange:hover { background: #c2410c; transform: translateY(-2px); }
        .spinner { border-top-color: #ea580c; }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-6">
      <!-- Loading Overlay -->
      <div id="loading-overlay" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center hidden">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 spinner"></div>
          <p class="text-xs font-black uppercase tracking-widest text-slate-400">Processing request...</p>
        </div>
      </div>

      <div class="max-w-md w-full glass rounded-[2.5rem] p-10 text-center shadow-2xl relative">
        <div class="h-20 w-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-orange-500/20">
          <svg class="h-10 w-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>

        <h1 class="text-3xl font-black uppercase tracking-tight mb-2">Verification Required</h1>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">Unlock Premium Document</p>

        <!-- Error Banner -->
        <div id="error-banner" class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center hidden">
          <p id="error-text" class="text-[10px] font-black uppercase text-red-400 tracking-wider"></p>
        </div>

        <!-- STEP 1: ENTER NAME & PHONE -->
        <div id="step-details" class="space-y-6">
          <div class="space-y-4">
            <div class="relative text-left">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
              <input type="text" id="name-input" placeholder="ENTER YOUR FULL NAME"
                     class="w-full rounded-2xl border-2 border-white/5 bg-white/5 py-4 px-5 text-[10px] font-black uppercase tracking-widest text-white placeholder-slate-600 outline-none focus:border-orange-500 transition-all mt-1">
            </div>

            <div class="relative text-left">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Mobile Number</label>
              <div class="flex items-center mt-1">
                <span class="bg-white/5 py-4 px-4 border-2 border-r-0 border-white/5 rounded-l-2xl text-[10px] font-black text-slate-400 select-none">+91</span>
                <input type="tel" id="phone-input" placeholder="10-DIGIT NUMBER" maxlength="10"
                       class="w-full rounded-r-2xl border-2 border-l-0 border-white/5 bg-white/5 py-4 px-5 text-[10px] font-black uppercase tracking-widest text-white placeholder-slate-600 outline-none focus:border-orange-500 transition-all">
              </div>
            </div>

            <div class="flex items-start gap-3 text-left pt-2">
              <input type="checkbox" id="terms-checkbox" class="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-orange-500 focus:ring-orange-500 cursor-pointer">
              <label for="terms-checkbox" class="text-[9px] font-bold text-slate-400 leading-relaxed cursor-pointer uppercase tracking-tight">
                I agree to the terms and privacy policy for official DSIRDA investment reports.
              </label>
            </div>
          </div>

          <button onclick="sendOtp()" class="w-full btn-orange py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
            Send Verification Code
          </button>
        </div>

        <!-- STEP 2: ENTER OTP -->
        <div id="step-otp" class="space-y-6 hidden">
          <div class="space-y-4 text-center">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Verification Code sent to <span id="phone-display" class="font-black text-white"></span>
            </p>
            <input type="text" id="otp-input" placeholder="ENTER 6-DIGIT OTP" maxlength="6"
                   class="w-full rounded-2xl border-2 border-white/5 bg-white/5 py-4 px-5 text-center text-xs font-black uppercase tracking-widest text-white placeholder-slate-600 outline-none focus:border-orange-500 transition-all mt-1">
          </div>

          <button onclick="verifyOtp()" class="w-full btn-orange py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
            Verify & View Document
          </button>

          <button onclick="goBack()" class="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
            Change Mobile Number
          </button>
        </div>

        <!-- STEP 3: SUCCESS STATE -->
        <div id="step-success" class="space-y-6 hidden">
          <div class="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 text-green-500">
            <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-black uppercase">Access Granted</h2>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading secure document stream...</p>
        </div>

        <!-- Firebase ReCAPTCHA Container -->
        <div id="recaptcha-container" class="hidden"></div>
      </div>

      <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

        const firebaseConfig = {
          apiKey: "${firebaseConfig.apiKey}",
          authDomain: "${firebaseConfig.authDomain}",
          projectId: "${firebaseConfig.projectId}",
          storageBucket: "${firebaseConfig.storageBucket}",
          messagingSenderId: "${firebaseConfig.messagingSenderId}",
          appId: "${firebaseConfig.appId}"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        let confirmationResult = null;
        let recaptchaVerifier = null;
        
        window.sendOtp = async function() {
          const name = document.getElementById('name-input').value.trim();
          const phone = document.getElementById('phone-input').value.replace(/\\D/g, '').slice(-10);
          const terms = document.getElementById('terms-checkbox').checked;
          
          const errDiv = document.getElementById('error-banner');
          const errText = document.getElementById('error-text');
          
          if (!name || name.length < 2) {
            errDiv.classList.remove('hidden');
            errText.innerText = "Please enter a valid name.";
            return;
          }
          if (!/^[6-9]\\d{9}$/.test(phone)) {
            errDiv.classList.remove('hidden');
            errText.innerText = "Please enter a valid 10-digit mobile number.";
            return;
          }
          if (!terms) {
            errDiv.classList.remove('hidden');
            errText.innerText = "You must agree to the terms and privacy policy.";
            return;
          }
          
          errDiv.classList.add('hidden');
          document.getElementById('loading-overlay').classList.remove('hidden');
          
          try {
            if (!recaptchaVerifier) {
              recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible'
              });
            }
            
            const phoneNumber = "+91" + phone;
            confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
            
            document.getElementById('step-details').classList.add('hidden');
            document.getElementById('step-otp').classList.remove('hidden');
            document.getElementById('phone-display').innerText = "+91 " + phone;
          } catch (err) {
            console.error(err);
            errDiv.classList.remove('hidden');
            errText.innerText = err.message || "Failed to send OTP. Check your number.";
            if (recaptchaVerifier) {
              try { recaptchaVerifier.clear(); } catch(e){}
              recaptchaVerifier = null;
            }
          } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
          }
        };

        window.verifyOtp = async function() {
          const code = document.getElementById('otp-input').value.replace(/\\D/g, '').slice(0, 6);
          const errDiv = document.getElementById('error-banner');
          const errText = document.getElementById('error-text');
          
          if (code.length !== 6) {
            errDiv.classList.remove('hidden');
            errText.innerText = "Please enter a valid 6-digit OTP.";
            return;
          }
          
          errDiv.classList.add('hidden');
          document.getElementById('loading-overlay').classList.remove('hidden');
          
          try {
            const result = await confirmationResult.confirm(code);
            const idToken = await result.user.getIdToken();
            
            const name = document.getElementById('name-input').value.trim();
            const phone = document.getElementById('phone-input').value.replace(/\\D/g, '').slice(-10);
            
            function getCookie(name) {
              const value = "; " + document.cookie;
              const parts = value.split("; " + name + "=");
              if (parts.length === 2) return parts.pop().split(";").shift();
              return "";
            }
            const fingerprint = getCookie('visitorFingerprint');
            
            const response = await fetch('/api/leads/verify-otp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name,
                phone,
                firebaseToken: idToken,
                browserFingerprint: fingerprint
              })
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
              document.cookie = "lead_token=" + data.lead_token + "; path=/; SameSite=Lax";
              document.cookie = "lead_name=" + encodeURIComponent(data.name) + "; path=/; SameSite=Lax";
              document.cookie = "lead_phone=" + data.phone + "; path=/; SameSite=Lax";
              
              document.getElementById('step-otp').classList.add('hidden');
              document.getElementById('step-success').classList.remove('hidden');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              throw new Error(data.error || "Failed to finalize session.");
            }
          } catch (err) {
            console.error(err);
            errDiv.classList.remove('hidden');
            errText.innerText = err.message || "Invalid OTP code. Please try again.";
          } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
          }
        };

        window.goBack = function() {
          document.getElementById('step-otp').classList.add('hidden');
          document.getElementById('step-details').classList.remove('hidden');
          document.getElementById('error-banner').classList.add('hidden');
        };
      </script>
    </body>
    </html>
  `);
}

function resolvePdfDiskPath(filePath) {
  const normalized = String(filePath || '').trim();
  if (!normalized) return null;
  if (path.isAbsolute(normalized)) return normalized;
  return path.resolve(__dirname, '..', normalized.replace(/^\/+/, ''));
}

async function watermarkPdfResponse(req, res, pdf, tokenParam) {
  let isAdmin = false;
  let appUser = null;
  let lead = null;

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

  let jwtPayload = null;
  if (tokenParam && JWT_SECRET) {
    try {
      jwtPayload = jwt.verify(tokenParam, JWT_SECRET);
      if (jwtPayload?.role === 'admin') isAdmin = true;
      if (jwtPayload?.role === 'user') {
        appUser = await AppUser.findByPk(jwtPayload.sub);
      }
    } catch (_) {}
  }

  if (!isAdmin && !appUser && tokenParam) {
    lead = await Lead.findOne({ where: { lead_token: tokenParam } });
  }

  const freeTrialId = parseInt(process.env.FREE_TRIAL_PDF_ID || '19', 10);
  const hasPdfAccess =
    isAdmin ||
    !!appUser ||
    !pdf.is_protected ||
    pdf.id === freeTrialId ||
    !!lead &&
      !!(await PdfPurchase.findOne({
        where: {
          lead_id: lead.id,
          status: 'completed',
          pdf_id: { [Op.in]: [pdf.id, 0] },
        },
      }));

  if (!hasPdfAccess) {
    return res.status(403).json({ error: 'You do not have access to this PDF.' });
  }

  const sourcePath = String(pdf.file_path || '').trim();
  let pdfBuffer = null;

  if (isRemotePdfPath(sourcePath)) {
    if (!isAllowedRemotePdfUrl(sourcePath)) {
      return res.status(403).json({ error: 'Remote PDF source is not allowed.' });
    }
    pdfBuffer = await fetchRemotePdfBuffer(sourcePath);
  } else {
    const diskPath = resolvePdfDiskPath(sourcePath);
    if (!diskPath || !fs.existsSync(diskPath)) {
      return res.status(404).json({ error: 'PDF file not found.' });
    }
    pdfBuffer = fs.readFileSync(diskPath);
  }

  const watermarkText =
    appUser?.email?.trim() ||
    lead?.email?.trim() ||
    lead?.phone?.trim() ||
    appUser?.name?.trim() ||
    lead?.name?.trim() ||
    'AUTHORIZED USER';

  const stampedBuffer = await applyWatermarkToPdf(pdfBuffer, watermarkText);
  const filename = `${String(pdf.title || 'document').replace(/[^a-z0-9_-]+/gi, '_')}.pdf`;

  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.send(stampedBuffer);
}

// GET secure PDF stream
router.get('/view/:id', appCheckVerification, async (req, res) => {
  try {
    const pdfId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(pdfId)) {
      return res.status(400).json({ error: 'Invalid PDF id.' });
    }

    const pdf = await PdfDocument.findByPk(pdfId);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found.' });
    }

    const tokenParam = req.headers.authorization || req.query.token || '';
    const cleanToken = tokenParam.toLowerCase().startsWith('bearer ')
      ? tokenParam.slice(7).trim()
      : tokenParam.trim();

    return await watermarkPdfResponse(req, res, pdf, cleanToken);
  } catch (err) {
    console.error('[PDF View Error]', err);
    return res.status(500).json({ error: 'Failed to load secure PDF.' });
  }
});

// Sync PDFs from disk into the database
router.post('/sync-disk', async (req, res) => {
  try {
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).json({ error: 'Uploads missing.' });
    }

    const files = fs.readdirSync(uploadsDir).filter(f => f.toLowerCase().endsWith('.pdf'));
    let added = 0;

    for (const fileName of files) {
      const filePath = `/uploads/${fileName}`;
      const [, created] = await PdfDocument.findOrCreate({
        where: { file_path: filePath },
        defaults: {
          title: fileName.replace(/\.pdf$/i, '').replace(/_/g, ' '),
          category: 'Discovered',
          is_protected: true,
        },
      });
      if (created) added++;
    }

    return res.json({ success: true, added });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
