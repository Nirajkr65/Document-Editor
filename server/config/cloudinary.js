import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn(
    'WARNING: Cloudinary credentials missing in .env. Falling back to mockup mode for uploads.'
  );
}

/**
 * Uploads a file buffer to Cloudinary or falls back to mock file URL
 * @param {Buffer} fileBuffer
 * @param {string} originalname
 * @param {string} folder
 * @returns {Promise<object>} upload result containing secure_url
 */
export const uploadStream = (fileBuffer, originalname = 'file.png', folder = 'collabspace_uploads') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      console.log('Using mockup upload fallback because Cloudinary is not configured.');
      
      setTimeout(() => {
        const isPdf = originalname.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
          // Resolve to a standard sample PDF document URL
          resolve({
            secure_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            public_id: 'mock_pdf_document',
          });
        } else {
          // Resolve to a randomized sample photo image
          const mockUrls = [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80'
          ];
          const randomIndex = Math.floor(Math.random() * mockUrls.length);
          resolve({
            secure_url: mockUrls[randomIndex],
            public_id: 'mock_image_document',
          });
        }
      }, 800);
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Detects images, PDFs, videos, audio, etc. automatically
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

export default cloudinary;
