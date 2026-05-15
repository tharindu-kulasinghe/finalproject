const ApiError = require('../utils/apiError');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    
    const flattenedRoles = [];
    for (const roleOrArray of allowedRoles) {
      if (Array.isArray(roleOrArray)) {
        flattenedRoles.push(...roleOrArray);
      } else {
        flattenedRoles.push(roleOrArray);
      }
    }
    
    if (!flattenedRoles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to access this resource');
    }
    
    next();
  };
};

module.exports = authorizeRoles;
