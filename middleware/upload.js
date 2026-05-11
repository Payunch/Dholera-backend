const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, hasCloudinaryConfig } = require('../services/cloudinary');

const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_IMAGE_FOLDER || 'dholera/images',
        resource_type: 'image',
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
          secure_url: result.secure_url
        });
      }
    );

    file.stream.on('error', cb);
    file.stream.pipe(uploadStream);
  },

  _removeFile(req, file, cb) {
    if (file?.public_id) {
      cloudinary.uploader.destroy(file.public_id, { resource_type: 'image' }).finally(() => cb(null));
      return;
    }

    cb(null);
  }
};

const storage = hasCloudinaryConfig()
  ? cloudinaryStorage
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/images');
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
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
