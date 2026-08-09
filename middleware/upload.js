const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { cloudinary, hasCloudinaryConfig } = require('../services/cloudinary');

const MAX_FILE_SIZE = Number.parseInt(process.env.UPLOAD_MAX_BYTES || `${10 * 1024 * 1024}`, 10);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const sniffFileType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  if (buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a) {
    return 'image/png';
  }

  if (buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  if (buffer.toString('ascii', 0, 4) === '%PDF') {
    return 'application/pdf';
  }

  return null;
};

const validateUploadBuffer = (buffer, file) => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty upload is not allowed.');
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File is too large.');
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const sniffed = sniffFileType(buffer);
  const reported = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('Invalid file extension.');
  }
  if (!ALLOWED_MIME_TYPES.has(reported)) {
    throw new Error('Invalid file type.');
  }
  if (!sniffed || sniffed !== reported) {
    throw new Error('File content does not match the declared type.');
  }
};

const uploadToCloudinary = async (buffer, file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        overwrite: true,
        unique_filename: true,
        use_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    Readable.from(buffer).on('error', reject).pipe(uploadStream);
  });
};

const writeLocalFile = async (buffer, file, subDir) => {
  const uploadDir = path.join(__dirname, '../uploads', subDir);
  await fs.promises.mkdir(uploadDir, { recursive: true });
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const finalName = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
  const finalPath = path.join(uploadDir, finalName);
  await fs.promises.writeFile(finalPath, buffer);
  return finalPath;
};

const storage = {
  async _handleFile(req, file, cb) {
    try {
      const chunks = [];
      let size = 0;

      file.stream.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_FILE_SIZE) {
          file.stream.destroy(new Error('File is too large.'));
          return;
        }
        chunks.push(chunk);
      });

      file.stream.on('error', cb);
      file.stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          validateUploadBuffer(buffer, file);

          const isPdf = file.mimetype === 'application/pdf';
          const folder = isPdf
            ? (process.env.CLOUDINARY_PDF_FOLDER || 'dholera/pdfs')
            : (process.env.CLOUDINARY_IMAGE_FOLDER || 'dholera/images');
          const subDir = isPdf ? 'pdfs' : 'images';

          if (hasCloudinaryConfig()) {
            const result = await uploadToCloudinary(buffer, file, folder);
            cb(null, {
              destination: 'cloudinary',
              filename: result.public_id,
              path: result.secure_url,
              size: result.bytes,
              public_id: result.public_id,
              format: result.format,
              secure_url: result.secure_url,
              resource_type: result.resource_type || 'auto',
            });
            return;
          }

          const finalPath = await writeLocalFile(buffer, file, subDir);
          cb(null, {
            destination: 'local',
            filename: path.basename(finalPath),
            path: finalPath,
            size: buffer.length,
          });
        } catch (error) {
          cb(error);
        }
      });
    } catch (error) {
      cb(error);
    }
  },

  _removeFile(req, file, cb) {
    if (file?.destination === 'cloudinary' && file?.public_id) {
      const resourceType = file.resource_type || 'auto';
      cloudinary.uploader.destroy(file.public_id, { resource_type: resourceType }).finally(() => cb(null));
      return;
    }

    if (file?.path && fs.existsSync(file.path)) {
      fs.promises.unlink(file.path).finally(() => cb(null));
      return;
    }

    cb(null);
  }
};

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimetype = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP, and PDF files are allowed.'), false);
    }
    return cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = upload;
