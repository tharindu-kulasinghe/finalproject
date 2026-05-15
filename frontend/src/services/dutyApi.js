import api from './api';

export const dutyApi = {
  getDuties: (params) => api.get('/duties', { params }),
  getDutyById: (id) => api.get(`/duties/${id}`),
  calculateDuty: (batchId) => api.post(`/duties/calculate/${batchId}`),
  updateDutyStatus: (id, status, remarks) => api.patch(`/duties/${id}/status`, { status, remarks }),
  waiveDuty: (id, reason) => api.patch(`/duties/${id}/status`, { status: 'WAIVED', remarks: reason }),
  cancelDuty: (id, reason) => api.patch(`/duties/${id}/status`, { status: 'CANCELLED', remarks: reason })
};

export default dutyApi;