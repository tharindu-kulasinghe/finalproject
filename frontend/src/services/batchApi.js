import api from './api';

export const batchApi = {
  getBatches: (params) => api.get('/batches', { params }),
  getBatchById: (id) => api.get(`/batches/${id}`),
  createBatch: (data) => api.post('/batches', data),
  updateBatch: (id, data) => api.patch(`/batches/${id}`, data),
  submitBatch: (id) => api.patch(`/batches/${id}/submit`),
  verifyBatch: (id, remarks) => api.patch(`/batches/${id}/verify`, remarks ? { remarks } : {}),
  rejectBatch: (id, remarks) => api.patch(`/batches/${id}/reject`, remarks ? { remarks } : {})
};

export default batchApi;