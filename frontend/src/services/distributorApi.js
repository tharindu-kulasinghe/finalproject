import api from './api';

const distributorApi = {
  createDistributor: (data) => api.post('/distributors', data),
  getActiveDistributors: () => api.get('/distributors/active'),
  createDistributorApplication: (id, data) => api.post(`/distributors/${id}/application`, data),
  getDistributorLicenseApplication: (id) => api.get(`/distributors/${id}/license-application`),
  getDistributionApplicationById: (applicationId) => api.get(`/distribution-applications/${applicationId}`),
  updateDistributionApplication: (applicationId, data) => api.patch(`/distribution-applications/${applicationId}`, data),
  uploadDistributionApplicationFile: (applicationId, formData) =>
  api.post(`/distribution-applications/${applicationId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDistributors: (params) => api.get('/distributors', { params }),
  getDistributorById: (id) => api.get(`/distributors/${id}`),
  updateDistributor: (id, data) => api.patch(`/distributors/${id}`, data),
  updateDistributorStatus: (id, status) => api.patch(`/distributors/${id}/status`, { status }),
  updateDistributorApplication: (id, data) => api.patch(`/distributors/${id}/application`, data),
  issueDistributorLicense: (id, data) => api.post(`/distributors/${id}/issue-license`, data),
  resetDistributorPassword: (id, newPassword) => api.patch(`/distributors/${id}/reset-password`, { newPassword }),
  getAvailableRetailers: () => api.get('/distributors/available/retailers')
};

export default distributorApi;