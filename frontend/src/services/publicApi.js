import api from './api';

const publicApi = {
  submitLicenseApplication: (data) => api.post('/public/license-applications', data)
};

export default publicApi;