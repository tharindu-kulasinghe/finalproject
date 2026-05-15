import api from './api';

const retailerApi = {
  createRetailer: (data) => api.post('/retailers', data),
  createRetailerApplication: (id, data) => api.post(`/retailers/${id}/application`, data),
  getRetailApplicationById: (applicationId) => api.get(`/retail-applications/${applicationId}`),
  updateRetailApplicationById: (applicationId, data) => api.patch(`/retail-applications/${applicationId}`, data),
  uploadRetailApplicationFile: (applicationId, formData) =>
  api.post(`/retail-applications/${applicationId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getRetailers: (params) => api.get('/retailers', { params }),
  getRetailerById: (id) => api.get(`/retailers/${id}`),
  updateRetailer: (id, data) => api.patch(`/retailers/${id}`, data),
  updateRetailerStatus: (id, status) => api.patch(`/retailers/${id}/status`, { status }),
  resetRetailerPassword: (id) => api.patch(`/retailers/${id}/reset-password`),
  updateRetailerApplication: (id, data) => api.patch(`/retailers/${id}/application`, data),
  getRetailerLicenseApplication: (id) => api.get(`/retailers/${id}/license-application`),
  issueRetailerLicense: (id, data) => api.post(`/retailers/${id}/issue-license`, data)
};

export default retailerApi;