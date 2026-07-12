import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'edit',
        'rename',
        'share',
        'unshare',
        'comment_add',
        'comment_reply',
        'comment_resolve',
      ],
    },
    details: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only log the creation timestamp
  }
);

const mongooseModel = mongoose.model('ActivityLog', activityLogSchema);

import { mockLogs, MockQuery } from './inMemoryDb.js';

class ActivityLogWrapper {
  static create(logData) {
    if (!global.isMockDB) {
      return mongooseModel.create(logData);
    }
    const { document, user, action, details } = logData;
    const newLog = {
      _id: 'mock_log_' + Math.random().toString(36).substr(2, 9),
      document: document ? document.toString() : '',
      user: user ? user.toString() : '',
      action,
      details,
      createdAt: new Date().toISOString(),
    };
    mockLogs.push(newLog);
    return Promise.resolve(newLog);
  }

  static find(query) {
    if (!global.isMockDB) {
      return mongooseModel.find(query);
    }
    const docId = query.document ? query.document.toString() : '';
    const results = mockLogs.filter(log => log.document.toString() === docId);
    return new MockQuery(results);
  }
}

export default ActivityLogWrapper;
