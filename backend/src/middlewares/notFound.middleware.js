const ApiError = require('../utils/apiError');

const notFound = (req, res, next) => {
  throw ApiError.notFound(`Route ${req.originalUrl} not found`);
};

module.exports = notFound;
