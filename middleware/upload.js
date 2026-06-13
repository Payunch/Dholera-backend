const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, hasCloudinaryConfig } = require('../services/cloudinary');

/**
 * Custom Multer storage for Cloudinary supporting both Images and PDFs
 */
const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    const isPdf = file.mimetype === 'application/pdf' || 
                 path.extname(file.originalname).toLowerCase() === '.pdf';
    
    const folder = isPdf 
      ? (process.env.CLOUDINARY_PDF_FOLDER || 'dholera/pdfs')
      : (process.env.CLOUDINARY_IMAGE_FOLDER || 'dholera/images');
    
    // Using 'auto' allows Cloudinary to detect the type (image, raw, video)
    // and is generally more robust for different file types.
    const resourceType = 'auto';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
        overwrite: true,
        unique_filename: true,
        use_filename: true
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]', error);
          cb(error);
          return;
        }

        cb(null, {
          destination: 'cloudinary',
          filename: result.public_id,
          path: result.secure_url,
          size: result.bytes,
          public_id: result.public_id,
          format: result.format,
          secure_url: result.secure_url,
          resource_type: result.resource_type || resourceType
        });
      }
    );

    file.stream.on('error', cb);
    file.stream.pipe(uploadStream);
  },

  _removeFile(req, file, cb) {
    if (file?.public_id) {
      // Use stored resource_type if available, otherwise fallback to auto
      const resourceType = file.resource_type || 'auto';
      cloudinary.uploader.destroy(file.public_id, { resource_type: resourceType }).finally(() => cb(null));
      return;
    }
    cb(null);
  }
};

/**
 * Local Disk Storage Fallback
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || 
                 path.extname(file.originalname).toLowerCase() === '.pdf';
    const subDir = isPdf ? 'pdfs' : 'images';
    const uploadDir = path.join(__dirname, '../uploads', subDir);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if ((file.mimetype === 'application/octet-stream' || !file.mimetype) && 
             (['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext))) {
    // Allow common extensions if mimetype is missing or generic (common in mobile uploads)
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype || 'unknown'}. Only images and PDFs are allowed!`), false);
  }
};

const dynamicStorage = {
  _handleFile(req, file, cb) {
    const isPdf = file.mimetype === 'application/pdf' || 
                 path.extname(file.originalname).toLowerCase() === '.pdf';
    if (isPdf || !hasCloudinaryConfig()) {
      diskStorage._handleFile(req, file, cb);
    } else {
      cloudinaryStorage._handleFile(req, file, cb);
    }
  },
  _removeFile(req, file, cb) {
    const isPdf = file.mimetype === 'application/pdf' || 
                 path.extname(file.originalname).toLowerCase() === '.pdf';
    if (isPdf || !hasCloudinaryConfig()) {
      diskStorage._removeFile(req, file, cb);
    } else {
      cloudinaryStorage._removeFile(req, file, cb);
    }
  }
};

const upload = multer({ 
  storage: dynamicStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Increased to 10MB for PDFs
});

module.exports = upload;
