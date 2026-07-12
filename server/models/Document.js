import mongoose from 'mongoose';

const replySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    commentId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    replies: [replySchema],
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['editor', 'viewer'],
          default: 'editor',
        },
      },
    ],
    comments: [commentSchema],
  },
  {
    timestamps: true,
  }
);

documentSchema.index(
  { title: 'text', content: 'text' },
  { weights: { title: 3, content: 1 }, name: 'DocumentTextIndex' }
);

const mongooseModel = mongoose.model('Document', documentSchema);

import { mockDocs, MockQuery } from './inMemoryDb.js';

class DocumentWrapper {
  static create(docData) {
    if (!global.isMockDB) {
      return mongooseModel.create(docData);
    }
    const { title, content, owner } = docData;
    const newDoc = {
      _id: 'mock_doc_' + Math.random().toString(36).substr(2, 9),
      title,
      content: content || '',
      owner: owner ? owner.toString() : '',
      collaborators: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDocs.push(newDoc);
    
    const mockDocInstance = {
      ...newDoc,
      save: async function() {
        return this;
      }
    };
    return Promise.resolve(mockDocInstance);
  }

  static find(query) {
    if (!global.isMockDB) {
      return mongooseModel.find(query);
    }
    let results = [...mockDocs];
    
    // Check text search
    if (query.$text && query.$text.$search) {
      const search = query.$text.$search.toLowerCase();
      results = results.filter(
        d => d.title.toLowerCase().includes(search) || d.content.toLowerCase().includes(search)
      );
    } else if (query.$or) {
      // Find matching owner or collaborators
      const userId = query.$or[0].owner ? query.$or[0].owner.toString() : '';
      results = results.filter(
        d => d.owner.toString() === userId || d.collaborators.some(c => c.user.toString() === userId)
      );
    }

    return new MockQuery(results);
  }

  static findById(id) {
    if (!global.isMockDB) {
      return mongooseModel.findById(id);
    }
    const dStr = id ? id.toString() : '';
    const doc = mockDocs.find(d => d._id.toString() === dStr);
    if (!doc) return new MockQuery(null);

    const mockDocInstance = {
      ...doc,
      save: async function() {
        const idx = mockDocs.findIndex(d => d._id.toString() === dStr);
        if (idx !== -1) {
          mockDocs[idx].title = this.title;
          mockDocs[idx].content = this.content;
          mockDocs[idx].collaborators = this.collaborators;
          mockDocs[idx].comments = this.comments;
          mockDocs[idx].updatedAt = new Date().toISOString();
        }
        return this;
      }
    };
    return new MockQuery(mockDocInstance);
  }

  static findByIdAndDelete(id) {
    if (!global.isMockDB) {
      return mongooseModel.findByIdAndDelete(id);
    }
    const dStr = id ? id.toString() : '';
    const idx = mockDocs.findIndex(d => d._id.toString() === dStr);
    if (idx !== -1) {
      const deleted = mockDocs[idx];
      mockDocs.splice(idx, 1);
      return Promise.resolve(deleted);
    }
    return Promise.resolve(null);
  }

  static findByIdAndRemove(id) {
    return this.findByIdAndDelete(id);
  }
}

export default DocumentWrapper;
