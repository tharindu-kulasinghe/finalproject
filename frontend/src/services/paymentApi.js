import api from './api';

export const paymentApi = {
  getPayments: (params) => api.get('/payments', { params }),
  getPaymentById: (id) => api.get(`/payments/${id}`),
  declarePayment: (data) => api.post('/payments', data),
  verifyPayment: (id, data = {}) => api.patch(`/payments/${id}/verify`, data),
  rejectPayment: (id, reason, remarks) => api.patch(`/payments/${id}/verify`, { status: 'REJECTED', rejectionReason: reason, remarks }),
  allocatePayment: (id, dutyAssessmentIds, amounts) => api.post(`/payments/${id}/allocate`, { dutyAssessmentIds, amounts })
};

export default paymentApi;