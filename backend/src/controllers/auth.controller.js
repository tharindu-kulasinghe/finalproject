const prisma = require('../prisma/client');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { UserRole, UserStatus } = require('@prisma/client');

const register = async (req, res, next) => {
  try {
    const { fullName, email, password, companyName, nic, address, mobile, role } = req.body;

    if (!fullName || !email || !password) {
      throw ApiError.badRequest('Full name, email and password are required');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(mobile ? [{ mobile }] : []),
          ...(nic ? [{ nic }] : [])
        ]
      }
    });

    if (existingUser) {
      throw ApiError.conflict('User with this email, mobile or NIC already exists');
    }

    const userRole =
      role && [UserRole.MANUFACTURER, UserRole.LICENSE_HOLDER, UserRole.DISTRIBUTOR].includes(role)
        ? role
        : UserRole.LICENSE_HOLDER;

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        companyName,
        nic,
        address,
        mobile,
        role: userRole,
        status: UserStatus.PENDING
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      description: `New user registered: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, user, 'Registration successful. Awaiting approval.');
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        profileImage: true,
        passwordHash: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}. Please contact administrator.`);
    }

    const token = generateToken(user.id, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      description: `User logged in: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage
      }
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        companyName: true,
        nic: true,
        address: true,
        role: true,
        status: true,
        profileImage: true,
        lastLoginAt: true,
        createdAt: true
      }
});
 
    return ApiResponse.success(res, user);
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const where = {};
    if (role) where.role = role;
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        companyName: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
 
    return ApiResponse.success(res, users);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, mobile, companyName, address } = req.body;
    const userId = req.user.id;

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });
      if (existingUser) {
        throw ApiError.conflict('Email already in use');
      }
    }

    if (mobile) {
      const existingMobile = await prisma.user.findFirst({
        where: {
          mobile,
          NOT: { id: userId }
        }
      });
      if (existingMobile) {
        throw ApiError.conflict('Mobile number already in use');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(mobile !== undefined && mobile !== '' && { mobile }),
        ...(companyName !== undefined && { companyName }),
        ...(address !== undefined && { address })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        companyName: true,
        address: true,
        role: true,
        status: true
      }
    });

    return ApiResponse.success(res, { user }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest('Current password and new password are required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      description: 'Password changed',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw ApiError.badRequest('Email is required');
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return ApiResponse.success(res, null, 'If the email exists, a reset link has been sent');
    }

    return ApiResponse.success(res, null, 'If the email exists, a reset link has been sent');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  updateProfile,
  changePassword,
  forgotPassword
};
