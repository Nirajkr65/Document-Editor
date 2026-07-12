import bcrypt from 'bcryptjs';

export const mockUsers = [];
export const mockDocs = [];
export const mockLogs = [];

export class MockQuery {
  constructor(data) {
    this.data = data;
  }
  
  populate(path, select) {
    if (!this.data) return this;
    
    const populateUser = (userId) => {
      if (!userId) return null;
      // If userId is already a populated object, extract its ID string to prevent converting [object Object]
      const idStr = typeof userId === 'object' && userId._id ? userId._id.toString() : userId.toString();
      const u = mockUsers.find(user => user._id.toString() === idStr);
      if (u) {
        return { 
          _id: u._id, 
          name: u.name, 
          email: u.email, 
          profilePicture: u.profilePicture || '' 
        };
      }
      return { 
        _id: idStr, 
        name: 'Collaborator', 
        email: 'collab@collabspace.com', 
        profilePicture: '' 
      };
    };

    try {
      if (Array.isArray(this.data)) {
        this.data = this.data.map(item => {
          const itemObj = JSON.parse(JSON.stringify(item));
          if (itemObj.owner) itemObj.owner = populateUser(itemObj.owner);
          if (itemObj.user) itemObj.user = populateUser(itemObj.user);
          if (itemObj.collaborators) {
            itemObj.collaborators = itemObj.collaborators.map(c => ({
              ...c,
              user: populateUser(c.user)
            }));
          }
          if (itemObj.comments) {
            itemObj.comments = itemObj.comments.map(c => ({
              ...c,
              user: populateUser(c.user),
              replies: (c.replies || []).map(r => ({
                ...r,
                user: populateUser(r.user)
              }))
            }));
          }
          return itemObj;
        });
      } else {
        const itemObj = JSON.parse(JSON.stringify(this.data));
        if (itemObj.owner) itemObj.owner = populateUser(itemObj.owner);
        if (itemObj.user) itemObj.user = populateUser(itemObj.user);
        if (itemObj.collaborators) {
          itemObj.collaborators = itemObj.collaborators.map(c => ({
            ...c,
            user: populateUser(c.user)
          }));
        }
        if (itemObj.comments) {
          itemObj.comments = itemObj.comments.map(c => ({
            ...c,
            user: populateUser(c.user),
            replies: (c.replies || []).map(r => ({
              ...r,
              user: populateUser(r.user)
            }))
          }));
        }
        this.data = itemObj;
      }
    } catch (e) {
      console.error('Error populating mock query:', e);
    }
    return this;
  }
  
  select(fields) {
    return this;
  }
  
  sort(options) {
    if (Array.isArray(this.data)) {
      this.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return this;
  }
  
  async exec() {
    return this.data;
  }
  
  then(onResolve, onReject) {
    return Promise.resolve(this.data).then(onResolve, onReject);
  }
}
