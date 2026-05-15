import api from './api';

export const verificationApi = {
  verifyStamp: (codeOrPayload, extraPayload = {}) => {
    const payload = typeof codeOrPayload === 'string' ?
    { codeValue: codeOrPayload, ...extraPayload } :
    codeOrPayload;
    return api.post('/verify', payload);
  },
  getVerificationHistory: (params) => api.get('/verifications', { params })
};

export default verificationApi;