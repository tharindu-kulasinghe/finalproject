const ApiError = require('../utils/apiError');

const errorHandler = (err, req, res, next) => {
  let error = err;
  
  if (!(err instanceof ApiError)) {
    error = ApiError.internal(err.message || 'Something went wrong');
  }
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  console.error('Error details:', {
    message: error.message,
    stack: err.stack,
    statusCode: error.statusCode
  });
  
  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
