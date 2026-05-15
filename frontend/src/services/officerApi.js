import api from './api';

export const officerApi = {
  getOfficers: async (params = {}) => {
    const response = await api.get('/officers', { params });
    return response.data;
  },

  getOfficerById: async (id) => {
    const response = await api.get(`/officers/${id}`);
    return response.data;
  },

  createOfficer: async (data) => {
    const response = await api.post('/officers', data);
    return response.data;
  },

  updateOfficer: async (id, data) => {
    const response = await api.patch(`/officers/${id}`, data);
    return response.data;
  },

  updateOfficerStatus: async (id, status) => {
    const response = await api.patch(`/officers/${id}/status`, { status });
    return response.data;
  },

  resetOfficerPassword: async (id, newPassword) => {
    const response = await api.patch(`/officers/${id}/reset-password`, { newPassword });
    return response.data;
  },

  uploadProfileImage: async (id, formData) => {
    const response = await api.patch(`/officers/${id}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getOfficerActivitySummary: async (id) => {
    const response = await api.get(`/officers/${id}/activity-summary`);
    return response.data;
  }
};

export default officerApi;