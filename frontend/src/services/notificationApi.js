import api from './api';

const notificationApi = {
  list: ({ unreadOnly = false, page = 1, limit = 50 } = {}) =>
  api.get('/notifications', { params: { unreadOnly, page, limit } }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all')
};

export default notificationApi;