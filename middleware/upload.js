const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, hasCloudinaryConfig } = require('../services/cloudinary');

/**
 * Custom Multer storage for Cloudinary supporting both Images and PDFs
 */
const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    const isPdf = file.mimetype === 'application/pdf';
    const folder = isPdf 
      ? (process.env.CLOUDINARY_PDF_FOLDER || 'dholera/pdfs')
      : (process.env.CLOUDINARY_IMAGE_FOLDER || 'dholera/images');
    
    // For PDFs, Cloudinary works best with 'raw' or 'auto'
    const resourceType = isPdf ? 'raw' : 'image';

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
          resource_type: resourceType
        });
      }
    );

    file.stream.on('error', cb);
    file.stream.pipe(uploadStream);
  },

  _removeFile(req, file, cb) {
    if (file?.public_id) {
      const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
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
    const isPdf = file.mimetype === 'application/pdf';
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
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images and PDFs are allowed!`), false);
  }
};

const upload = multer({ 
  storage: hasCloudinaryConfig() ? cloudinaryStorage : diskStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Increased to 10MB for PDFs
});

module.exports = upload;
