import express from 'express';
import multer from 'multer';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  uploadUserProfilePicture,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/upload', protect, upload.single('image'), uploadUserProfilePicture);

export default router;
