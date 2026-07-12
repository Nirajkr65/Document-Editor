import express from 'express';
import {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  shareDocument,
  removeCollaborator,
  addComment,
  addReply,
  resolveComment,
  deleteComment,
  getActivityLogs,
  uploadDocumentMedia,
  summarizeDocument,
  aiWritingAssist,
} from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';

// Multer memory storage configure
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const router = express.Router();

// Secure all endpoints in this router
router.use(protect);

// Upload endpoint (must be declared BEFORE /:id path parameters to prevent matching collisions)
router.post('/upload', upload.single('file'), uploadDocumentMedia);

router.route('/')
  .post(createDocument)
  .get(getDocuments);

router.route('/:id')
  .get(getDocumentById)
  .put(updateDocument)
  .delete(deleteDocument);

router.post('/:id/share', shareDocument);
router.delete('/:id/share/:userId', removeCollaborator);

// Comments Endpoints
router.post('/:id/comments', addComment);
router.post('/:id/comments/:commentId/reply', addReply);
router.put('/:id/comments/:commentId/resolve', resolveComment);
router.delete('/:id/comments/:commentId', deleteComment);

// Activity Logs Endpoint
router.get('/:id/activity', getActivityLogs);

// AI Endpoints
router.post('/:id/summarize', summarizeDocument);
router.post('/:id/ai-assist', aiWritingAssist);

export default router;
