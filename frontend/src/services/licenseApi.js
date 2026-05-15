import api from './api';

export const licenseApi = {
  getApplications: (params) => api.get('/license-applications', { params }),
  getApplicationById: (id) => api.get(`/license-applications/${id}`),
  createApplication: (data) => api.post('/license-applications', data),
  updateApplication: (id, data) => api.patch(`/license-applications/${id}`, data),
  updateApplicationStatus: (id, data) => api.patch(`/license-applications/${id}/status`, data),
  getManufacturingApplications: (params) => api.get('/manufacturing-applications', { params }),
  getManufacturingApplicationById: (id) => api.get(`/manufacturing-applications/${id}`),
  getDistributionApplications: (params) => api.get('/distribution-applications', { params }),
  getDistributionApplicationById: (id) => api.get(`/distribution-applications/${id}`),
  getRetailApplications: (params) => api.get('/retail-applications', { params }),
  getRetailApplicationById: (id) => api.get(`/retail-applications/${id}`),
  updateManufacturingApplicationStatus: (id, data) => api.patch(`/manufacturing-applications/${id}/status`, data),
  updateDistributionApplicationStatus: (id, data) => api.patch(`/distribution-applications/${id}/status`, data),
  updateRetailApplicationStatus: (id, data) => api.patch(`/retail-applications/${id}/status`, data),
  getLicenses: (params) => api.get('/licenses', { params }),
  getLicenseById: (id) => api.get(`/licenses/${id}`),
  createLicense: (data) => api.post('/licenses', data),
  updateLicense: (id, data) => api.patch(`/licenses/${id}`, data),
  updateLicenseStatus: (id, data) => api.patch(`/licenses/${id}/status`, data),
  renewLicense: (id) => api.post(`/licenses/${id}/renew`),
  getMyLicenses: () => api.get('/licenses/my')
};

export default licenseApi;