import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const mongooseModel = mongoose.model('User', userSchema);

import { mockUsers, MockQuery } from './inMemoryDb.js';

class UserWrapper {
  static findOne(query) {
    if (!global.isMockDB) {
      return mongooseModel.findOne(query);
    }
    const { email } = query;
    const user = mockUsers.find(u => u.email === email);
    if (!user) return new MockQuery(null);
    const mockUserInstance = {
      ...user,
      matchPassword: async function(enteredPassword) {
        return bcrypt.compare(enteredPassword, user.password);
      },
      save: async function() {
        return this;
      }
    };
    return new MockQuery(mockUserInstance);
  }

  static create(userData) {
    if (!global.isMockDB) {
      return mongooseModel.create(userData);
    }
    const { name, email, password } = userData;
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const newUser = {
      _id: 'mock_user_' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      password: hashedPassword,
      profilePicture: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    
    const mockUserInstance = {
      ...newUser,
      matchPassword: async function(enteredPassword) {
        return bcrypt.compare(enteredPassword, newUser.password);
      },
      save: async function() {
        return this;
      }
    };
    return Promise.resolve(mockUserInstance);
  }

  static findById(id) {
    if (!global.isMockDB) {
      return mongooseModel.findById(id);
    }
    const uStr = id ? id.toString() : '';
    const user = mockUsers.find(u => u._id.toString() === uStr);
    if (!user) return new MockQuery(null);
    const mockUserInstance = {
      ...user,
      matchPassword: async function(enteredPassword) {
        return bcrypt.compare(enteredPassword, user.password);
      },
      save: async function() {
        if (this.name) user.name = this.name;
        if (this.email) user.email = this.email;
        if (this.profilePicture !== undefined) user.profilePicture = this.profilePicture;
        if (this.password) {
          const salt = bcrypt.genSaltSync(10);
          user.password = bcrypt.hashSync(this.password, salt);
        }
        return this;
      }
    };
    return new MockQuery(mockUserInstance);
  }
}

export default UserWrapper;
