import api from './api';

const manufacturerApi = {
  createManufacturer: (data) => api.post('/manufacturers', data),
  getActiveManufacturers: () => api.get('/manufacturers/active'),
  createManufacturerApplication: (id, data) => api.post(`/manufacturers/${id}/application`, data),
  uploadManufacturingApplicationFile: (applicationId, formData) =>
  api.post(`/manufacturing-applications/${applicationId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getManufacturers: (params) => api.get('/manufacturers', { params }),
  getManufacturerById: (id) => api.get(`/manufacturers/${id}`),
  updateManufacturer: (id, data) => api.patch(`/manufacturers/${id}`, data),
  updateManufacturerStatus: (id, status) => api.patch(`/manufacturers/${id}/status`, { status }),
  resetManufacturerPassword: (id) => api.patch(`/manufacturers/${id}/reset-password`),
  updateManufacturerApplication: (id, data) => api.patch(`/manufacturers/${id}/application`, data),
  getManufacturerLicenseApplication: (id) => api.get(`/manufacturers/${id}/license-application`),
  issueManufacturerLicense: (id, data) => api.post(`/manufacturers/${id}/issue-license`, data)
};

export default manufacturerApi;