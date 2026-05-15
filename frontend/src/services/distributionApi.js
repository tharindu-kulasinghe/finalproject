import api from './api';

export const distributionApi = {
  createDistribution: (data) => api.post('/distributions', data),
  getOrders: (params) => api.get('/distributions', { params }),
  getOrderById: (id) => api.get(`/distributions/${id}`),
  dispatchOrder: (id) => api.patch(`/distributions/${id}/dispatch`),
  receiveOrder: (id) => api.patch(`/distributions/${id}/receive`),
  getAvailableRetailers: () => api.get('/distributors/available/retailers'),
  getMyStock: () => api.get('/distributors/stock/my')
};

export default distributionApi;