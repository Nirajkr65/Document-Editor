import Document from '../models/Document.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { uploadStream } from '../config/cloudinary.js';
import { generateAISummary, generateAIWritingAssistance } from '../config/gemini.js';

// Helper to populate all owner, collaborators, comments, and replies
const populateDocDetails = (query) => {
  return query
    .populate('owner', 'name email profilePicture')
    .populate('collaborators.user', 'name email profilePicture')
    .populate('comments.user', 'name email profilePicture')
    .populate('comments.replies.user', 'name email profilePicture');
};

// Helper to log document events in ActivityLog database collection
const logActivity = async (documentId, userId, action, details) => {
  try {
    await ActivityLog.create({
      document: documentId,
      user: userId,
      action,
      details,
    });
  } catch (err) {
    console.error('Failed to log document activity:', err);
  }
};

// @desc    Create a new document
// @route   POST /api/documents
// @access  Private
export const createDocument = async (req, res, next) => {
  const { title, content } = req.body;

  try {
    if (!title) {
      res.status(400);
      throw new Error('Title is required');
    }

    const document = await Document.create({
      title,
      content: content || '',
      owner: req.user._id,
    });

    // Write activity log
    await logActivity(document._id, req.user._id, 'create', `Created document "${title}"`);

    const populatedDoc = await populateDocDetails(Document.findById(document._id));
    res.status(201).json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all documents for logged-in user
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
  const { search } = req.query;

  try {
    let query = {
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    };

    if (search) {
      query = {
        $and: [
          query,
          { $text: { $search: search } }
        ]
      };
    }

    let documentsQuery = Document.find(query);

    if (search) {
      documentsQuery = documentsQuery
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      documentsQuery = documentsQuery.sort({ updatedAt: -1 });
    }

    const documents = await populateDocDetails(documentsQuery);
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a document by ID
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = async (req, res, next) => {
  try {
    const document = await populateDocDetails(Document.findById(req.params.id));

    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    const isOwner = document.owner._id.toString() === req.user._id.toString();
    const isCollaborator = document.collaborators.some(
      (c) => c.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      res.status(403);
      throw new Error('Not authorized to access this document');
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a document
// @route   PUT /api/documents/:id
// @access  Private
export const updateDocument = async (req, res, next) => {
  const { title, content } = req.body;

  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    const isOwner = document.owner.toString() === req.user._id.toString();
    const isEditor = document.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString() && c.role === 'editor'
    );

    if (!isOwner && !isEditor) {
      res.status(403);
      throw new Error('Not authorized to edit this document');
    }

    // Write activity logs for title renames or content changes
    if (title !== undefined && title !== document.title) {
      await logActivity(document._id, req.user._id, 'rename', `Renamed document to "${title}"`);
      document.title = title;
    }
    
    if (content !== undefined && content !== document.content) {
      // Strip html/markdown for a concise details message if needed, or simply log "Edited content"
      await logActivity(document._id, req.user._id, 'edit', 'Edited document content');
      document.content = content;
    }

    const updatedDocument = await document.save();

    const populatedDoc = await populateDocDetails(Document.findById(updatedDocument._id));
    res.json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    if (document.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this document');
    }

    // Note: Activity logs linked to this document will be orphaned or can be deleted,
    // but standard behavior is to delete the main document
    await Document.deleteOne({ _id: req.params.id });
    
    // Also clean up activity logs for the document
    await ActivityLog.deleteMany({ document: req.params.id });

    res.json({ message: 'Document removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Share a document with a user
// @route   POST /api/documents/:id/share
// @access  Private
export const shareDocument = async (req, res, next) => {
  const { email, role } = req.body;

  try {
    if (!email) {
      res.status(400);
      throw new Error('Collaborator email is required');
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    // Only owners can share
    if (document.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the document owner can share it');
    }

    // Find target user by email
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      res.status(404);
      throw new Error('User with this email not found');
    }

    // Check if target user is the owner
    if (targetUser._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('You cannot share a document with yourself');
    }

    // Check if user is already in collaborator list
    const existingIndex = document.collaborators.findIndex(
      (c) => c.user.toString() === targetUser._id.toString()
    );

    if (existingIndex > -1) {
      document.collaborators[existingIndex].role = role || 'editor';
    } else {
      document.collaborators.push({
        user: targetUser._id,
        role: role || 'editor',
      });
    }

    await document.save();

    // Log the share event
    await logActivity(
      document._id,
      req.user._id,
      'share',
      `Shared document with ${targetUser.name} (${email}) as ${role || 'editor'}`
    );

    const populatedDoc = await populateDocDetails(Document.findById(document._id));
    res.json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a collaborator from a document
// @route   DELETE /api/documents/:id/share/:userId
// @access  Private
export const removeCollaborator = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    // Only owners can remove collaborators
    if (document.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the document owner can remove collaborators');
    }

    const targetUser = await User.findById(req.params.userId);
    const targetName = targetUser ? targetUser.name : 'collaborator';

    document.collaborators = document.collaborators.filter(
      (c) => c.user.toString() !== req.params.userId.toString()
    );

    await document.save();

    // Log the unshare event
    await logActivity(
      document._id,
      req.user._id,
      'unshare',
      `Revoked access for ${targetName}`
    );

    const populatedDoc = await populateDocDetails(Document.findById(document._id));
    res.json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a comment to a document
// @route   POST /api/documents/:id/comments
// @access  Private
export const addComment = async (req, res, next) => {
  const { commentId, text } = req.body;

  try {
    if (!commentId || !text) {
      res.status(400);
      throw new Error('CommentId and comment text are required');
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    // Verify authorized user
    const isOwner = document.owner.toString() === req.user._id.toString();
    const isCollaborator = document.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      res.status(403);
      throw new Error('Not authorized to comment on this document');
    }

    document.comments.push({
      commentId,
      text,
      user: req.user._id,
      isResolved: false,
      replies: [],
    });

    await document.save();

    // Log comment addition
    await logActivity(
      document._id,
      req.user._id,
      'comment_add',
      `Added inline comment: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`
    );

    const populatedDoc = await populateDocDetails(Document.findById(document._id));
    res.status(201).json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a reply to a comment
// @route   POST /api/documents/:id/comments/:commentId/reply
// @access  Private
export const addReply = async (req, res, next) => {
  const { text } = req.body;

  try {
    if (!text) {
      res.status(400);
      throw new Error('Reply text is required');
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    const comment = document.comments.find(
      (c) => c.commentId === req.params.commentId || c._id.toString() === req.params.commentId
    );

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    comment.replies.push({
      text,
      user: req.user._id,
    });

    await document.save();

    // Log comment reply
    await logActivity(
      document._id,
      req.user._id,
      'comment_reply',
      `Replied to comment thread: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`
    );

    const populatedDoc = await populateDocDetails(Document.findById(document._id));
    res.json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve or unresolve a comment
// @route   PUT /api/documents/:id/comments/:commentId/resolve
// @access  Private
export const resolveComment = async (req, res, next) => {
  const { isResolved } = req.body;

  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    const comment = document.comments.find(
      (c) => c.commentId === req.params.commentId || c._id.toString() === req.params.commentId
    );

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    const newStatus = isResolved !== undefined ? isResolved : true;
    comment.isResolved = newStatus;

    await document.save();

    // Log comment resolution/reopen
    await logActivity(
      document._id,
      req.user._id,
      'comment_resolve',
      newStatus ? 'Resolved a comment thread' : 'Reopened a comment thread'
    );

    const populatedDoc = await populateDocDetails(Document.findById(document._id));
    res.json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/documents/:id/comments/:commentId
// @access  Private
export const deleteComment = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    document.comments = document.comments.filter(
      (c) => c.commentId !== req.params.commentId && c._id.toString() !== req.params.commentId
    );

    await document.save();

    // Log comment deletion
    await logActivity(
      document._id,
      req.user._id,
      'comment_resolve', // Use resolve status or just mark delete activity
      'Deleted a comment thread'
    );

    const populatedDoc = await populateDocDetails(Document.findById(document._id));
    res.json(populatedDoc);
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity logs for a document
// @route   GET /api/documents/:id/activity
// @access  Private
export const getActivityLogs = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    // Verify authorized user
    const isOwner = document.owner.toString() === req.user._id.toString();
    const isCollaborator = document.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      res.status(403);
      throw new Error('Not authorized to access this document logs');
    }

    const logs = await ActivityLog.find({ document: req.params.id })
      .populate('user', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload document media (images/PDFs) to Cloudinary
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocumentMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file uploaded');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      res.status(400);
      throw new Error('Invalid file type. Only images and PDFs are allowed.');
    }

    const result = await uploadStream(req.file.buffer, req.file.originalname, 'collabspace_documents');

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Summarize document using Gemini AI
// @route   POST /api/documents/:id/summarize
// @access  Private
export const summarizeDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    // Verify authorization
    const isOwner = document.owner.toString() === req.user._id.toString();
    const isCollaborator = document.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString()
    );
    if (!isOwner && !isCollaborator) {
      res.status(403);
      throw new Error('Not authorized to access this document');
    }

    const summary = await generateAISummary(document.content || '');
    res.json({ summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Get writing assistance on selection / prompt using Gemini AI
// @route   POST /api/documents/:id/ai-assist
// @access  Private
export const aiWritingAssist = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    // Verify write authorization
    const isOwner = document.owner.toString() === req.user._id.toString();
    const isCollaborator = document.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString() && c.role === 'editor'
    );
    if (!isOwner && !isCollaborator) {
      res.status(403);
      throw new Error('Not authorized to edit this document');
    }

    const { instruction, selectedText } = req.body;
    if (!instruction) {
      res.status(400);
      throw new Error('User AI instruction is required');
    }

    // Default to full document content if no selection text is sent
    const textToRefine = selectedText && selectedText.trim() ? selectedText : (document.content || '');
    if (!textToRefine || !textToRefine.trim()) {
      res.status(400);
      throw new Error('There is no content in the document to process');
    }

    const refinedText = await generateAIWritingAssistance(textToRefine, instruction);
    res.json({ refinedText });
  } catch (error) {
    next(error);
  }
};
