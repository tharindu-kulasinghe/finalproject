import api from './api';

export const taxRateApi = {
  getTaxRates: (params) => api.get('/tax-rates', { params }),
  getTaxRateById: (id) => api.get(`/tax-rates/${id}`),
  createTaxRate: (data) => api.post('/tax-rates', data),
  updateTaxRate: (id, data) => api.put(`/tax-rates/${id}`, data),
  toggleTaxRate: (id) => api.patch(`/tax-rates/${id}/toggle`)
};

export default taxRateApi;