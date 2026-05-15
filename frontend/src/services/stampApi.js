import api from './api';

export const stampApi = {
  getStampRequests: (params) => api.get('/stamp-requests', { params }),
  getStampRequestById: (id) => api.get(`/stamp-requests/${id}`),
  createStampRequest: (data) => api.post('/stamp-requests', data),
  reviewStampRequest: (id, data) => api.patch(`/stamp-requests/${id}/review`, data),
  approveStampRequest: (id, quantityApproved) => api.patch(`/stamp-requests/${id}/review`, { status: 'APPROVED', ...(quantityApproved !== undefined ? { quantityApproved } : {}) }),
  rejectStampRequest: (id, reason) => api.patch(`/stamp-requests/${id}/review`, { status: 'REJECTED', reason }),
  issueStamps: (id, quantityIssued) => api.patch(`/stamp-requests/${id}/issue`, quantityIssued !== undefined ? { quantityIssued } : {}),
  downloadStampBundleZip: () => api.get('/stamp-requests/download/zip', { responseType: 'blob' }),
  downloadStampRequestZip: (id) => api.get(`/stamp-requests/${id}/download/zip`, { responseType: 'blob' }),
  getTaxStamps: (params) => api.get('/tax-stamps', { params }),
  getTaxStampById: (id) => api.get(`/tax-stamps/${id}`),
  verifyStamp: (data) => api.post('/verify', data)
};

export default stampApi;