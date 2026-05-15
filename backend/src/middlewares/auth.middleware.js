const { verifyToken } = require('../utils/jwt');
const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { UserStatus } = require('@prisma/client');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true
      }
    });
    
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }
    
    if (user.status !== UserStatus.ACTIVE) {
      throw ApiError.forbidden('User account is not active');
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};

module.exports = authenticate;
