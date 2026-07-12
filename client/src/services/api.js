import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api',
});

// Request interceptor to attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Document API Helper Methods
API.getDocuments = (search = '') => API.get(search ? `/documents?search=${encodeURIComponent(search)}` : '/documents');
API.getDocument = (id) => API.get(`/documents/${id}`);
API.createDocument = (title, content) => API.post('/documents', { title, content });
API.updateDocument = (id, data) => API.put(`/documents/${id}`, data);
API.deleteDocument = (id) => API.delete(`/documents/${id}`);
API.shareDocument = (id, email, role) => API.post(`/documents/${id}/share`, { email, role });
API.removeCollaborator = (id, userId) => API.delete(`/documents/${id}/share/${userId}`);
API.addComment = (id, commentId, text) => API.post(`/documents/${id}/comments`, { commentId, text });
API.addReply = (id, commentId, text) => API.post(`/documents/${id}/comments/${commentId}/reply`, { text });
API.resolveComment = (id, commentId, isResolved) => API.put(`/documents/${id}/comments/${commentId}/resolve`, { isResolved });
API.deleteComment = (id, commentId) => API.delete(`/documents/${id}/comments/${commentId}`);
API.getActivityLog = (id) => API.get(`/documents/${id}/activity`);
API.uploadMedia = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

API.summarizeDocument = (id) => API.post(`/documents/${id}/summarize`);
API.aiAssist = (id, payload) => API.post(`/documents/${id}/ai-assist`, payload);

export default API;
