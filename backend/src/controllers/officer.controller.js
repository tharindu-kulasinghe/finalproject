const prisma = require('../prisma/client');
const { hashPassword } = require('../utils/hash');
const { logAudit } = require('../utils/auditLogger');
const ApiError = require('../utils/apiError');
const { UserRole, UserStatus } = require('@prisma/client');

const createOfficer = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      mobile,
      password,
      employeeNo,
      position,
      department,
      officeName,
      district,
      province,
      appointmentDate,
      employmentType,
      gender,
      dateOfBirth,
      address,
      emergencyContactName,
      emergencyContactPhone,
      officialEmail,
      officialPhone,
      lastPromotionDate,
      notes,
      role
    } = req.body;

    if (!fullName || !email || !password || !employeeNo || !position || !officeName) {
      throw ApiError.badRequest('Full name, email, password, employee number, position, and office name are required');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { employeeNo }
        ]
      }
    });

    if (existingUser) {
      throw ApiError.badRequest('User with this email or employee number already exists');
    }

    const passwordHash = await hashPassword(password);
    const userRole = role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.ED_OFFICER;

    const officerData = {
      fullName,
      email,
      passwordHash,
      employeeNo,
      position,
      department,
      officeName,
      district,
      province,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
      employmentType,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address,
      emergencyContactName,
      emergencyContactPhone,
      officialEmail,
      officialPhone,
      lastPromotionDate: lastPromotionDate ? new Date(lastPromotionDate) : null,
      notes,
      role: userRole,
      status: UserStatus.ACTIVE
    };

    if (mobile) {
      officerData.mobile = mobile;
    }

    const officer = await prisma.user.create({
      data: officerData
    });

    await logAudit({
      userId: req.user.id,
      action: 'OFFICER_CREATED',
      entityType: 'Officer',
      entityId: officer.id,
      description: `Officer account created for ${fullName} (${employeeNo})`,
      newValues: JSON.stringify({ fullName, email, employeeNo, position, officeName, role: userRole }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Officer created successfully',
      data: {
        id: officer.id,
        fullName: officer.fullName,
        email: officer.email,
        role: officer.role,
        status: officer.status,
        employeeNo: officer.employeeNo,
        position: officer.position,
        officeName: officer.officeName
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOfficers = async (req, res, next) => {
  try {
    const { status, position, officeName, district, search, page = 1, limit = 20 } = req.query;

    const where = {
      role: { in: [UserRole.ED_OFFICER, UserRole.ADMIN] }
    };

    if (status) {
      where.status = status;
    }

    if (position) {
      where.position = position;
    }

    if (officeName) {
      where.officeName = { contains: officeName };
    }

    if (district) {
      where.district = { contains: district };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { employeeNo: { contains: search } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [officers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          fullName: true,
          email: true,
          mobile: true,
          role: true,
          status: true,
          employeeNo: true,
          position: true,
          department: true,
          officeName: true,
          district: true,
          province: true,
          employmentType: true,
          gender: true,
          profileImage: true,
          createdAt: true,
          lastLoginAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: officers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOfficerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const officer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        employeeNo: true,
        nic: true,
        position: true,
        department: true,
        officeName: true,
        district: true,
        province: true,
        appointmentDate: true,
        employmentType: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        officialEmail: true,
        officialPhone: true,
        profileImage: true,
        lastPromotionDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });

    if (!officer) {
      throw ApiError.notFound('Officer not found');
    }

    res.json({
      success: true,
      data: officer
    });
  } catch (error) {
    next(error);
  }
};

const updateOfficer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      mobile,
      employeeNo,
      nic,
      position,
      department,
      officeName,
      district,
      province,
      appointmentDate,
      employmentType,
      gender,
      dateOfBirth,
      address,
      emergencyContactName,
      emergencyContactPhone,
      officialEmail,
      officialPhone,
      lastPromotionDate,
      notes
    } = req.body;

    const existingOfficer = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingOfficer) {
      throw ApiError.notFound('Officer not found');
    }

    if (![UserRole.ED_OFFICER, UserRole.ADMIN].includes(existingOfficer.role)) {
      throw ApiError.badRequest('User is not an officer');
    }

    if (employeeNo && employeeNo !== existingOfficer.employeeNo) {
      const duplicateEmployee = await prisma.user.findFirst({
        where: { employeeNo, id: { not: id } }
      });
      if (duplicateEmployee) {
        throw ApiError.badRequest('Employee number already exists');
      }
    }

    if (nic && nic !== existingOfficer.nic) {
      const duplicateNic = await prisma.user.findFirst({
        where: { nic, id: { not: id } }
      });
      if (duplicateNic) {
        throw ApiError.badRequest('NIC already exists');
      }
    }

    const oldValues = JSON.stringify({
      fullName: existingOfficer.fullName,
      mobile: existingOfficer.mobile,
      position: existingOfficer.position,
      officeName: existingOfficer.officeName,
      district: existingOfficer.district
    });

    const updateData = {
      fullName,
      position,
      officeName,
      district,
      province,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
      employmentType,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      emergencyContactName,
      emergencyContactPhone,
      officialEmail,
      officialPhone,
      lastPromotionDate: lastPromotionDate ? new Date(lastPromotionDate) : undefined,
      notes
    };

    if (employeeNo) {
      updateData.employeeNo = employeeNo;
    }

    if (nic) {
      updateData.nic = nic;
    }

    if (department) {
      updateData.department = department;
    }

    if (mobile) {
      updateData.mobile = mobile;
    }

    const officer = await prisma.user.update({
      where: { id },
      data: updateData
    });

    await logAudit({
      userId: req.user.id,
      action: 'OFFICER_UPDATED',
      entityType: 'Officer',
      entityId: officer.id,
      description: `Officer profile updated for ${officer.fullName} (${officer.employeeNo})`,
      oldValues,
      newValues: JSON.stringify({ fullName, mobile, position, officeName, district }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Officer updated successfully',
      data: {
        id: officer.id,
        fullName: officer.fullName,
        email: officer.email,
        role: officer.role,
        status: officer.status,
        employeeNo: officer.employeeNo,
        position: officer.position,
        officeName: officer.officeName
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateOfficerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED, UserStatus.PENDING];
    if (!status || !validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status. Must be one of: ACTIVE, INACTIVE, SUSPENDED, PENDING');
    }

    const existingOfficer = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingOfficer) {
      throw ApiError.notFound('Officer not found');
    }

    if (![UserRole.ED_OFFICER, UserRole.ADMIN].includes(existingOfficer.role)) {
      throw ApiError.badRequest('User is not an officer');
    }

    const oldStatus = existingOfficer.status;

    const officer = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await logAudit({
      userId: req.user.id,
      action: 'OFFICER_STATUS_CHANGED',
      entityType: 'Officer',
      entityId: officer.id,
      description: `Officer status changed from ${oldStatus} to ${status} for ${officer.fullName}`,
      oldValues: JSON.stringify({ status: oldStatus }),
      newValues: JSON.stringify({ status }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: `Officer status updated to ${status}`,
      data: {
        id: officer.id,
        fullName: officer.fullName,
        status: officer.status
      }
    });
  } catch (error) {
    next(error);
  }
};

const resetOfficerPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }

    const existingOfficer = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingOfficer) {
      throw ApiError.notFound('Officer not found');
    }

    if (![UserRole.ED_OFFICER, UserRole.ADMIN].includes(existingOfficer.role)) {
      throw ApiError.badRequest('User is not an officer');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await logAudit({
      userId: req.user.id,
      action: 'OFFICER_PASSWORD_RESET',
      entityType: 'Officer',
      entityId: existingOfficer.id,
      description: `Password reset for officer ${existingOfficer.fullName}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

const uploadOfficerProfileImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      throw ApiError.badRequest('No image file uploaded');
    }

    const existingOfficer = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingOfficer) {
      throw ApiError.notFound('Officer not found');
    }

    if (![UserRole.ED_OFFICER, UserRole.ADMIN].includes(existingOfficer.role)) {
      throw ApiError.badRequest('User is not an officer');
    }

    const profileImagePath = `/uploads/${req.file.filename}`;

    const officer = await prisma.user.update({
      where: { id },
      data: { profileImage: profileImagePath }
    });

    await logAudit({
      userId: req.user.id,
      action: 'OFFICER_PROFILE_IMAGE_UPLOADED',
      entityType: 'Officer',
      entityId: officer.id,
      description: `Profile image uploaded for officer ${officer.fullName}`,
      newValues: JSON.stringify({ profileImage: profileImagePath }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        id: officer.id,
        fullName: officer.fullName,
        profileImage: officer.profileImage
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOfficerActivitySummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingOfficer = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingOfficer) {
      throw ApiError.notFound('Officer not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      recentLogins,
      manufacturingAppsReviewed,
      distributionAppsReviewed,
      retailAppsReviewed,
      licensesReviewed,
      paymentsVerified,
      stampRequestsReviewed,
      batchesVerified
    ] = await Promise.all([
      prisma.auditLog.count({
        where: {
          userId: id,
          action: 'LOGIN',
          occurredAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.manufacturingApplication.count({
        where: {
          reviewedById: id,
          reviewedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.distributionApplication.count({
        where: {
          reviewedById: id,
          reviewedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.retailApplication.count({
        where: {
          reviewedById: id,
          reviewedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.license.count({
        where: {
          OR: [
            { manufacturingApplication: { is: { reviewedById: id } } },
            { distributionApplication: { is: { reviewedById: id } } },
            { retailApplication: { is: { reviewedById: id } } }
          ]
        }
      }),
      prisma.payment.count({
        where: {
          verifiedById: id,
          verifiedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.stampRequest.count({
        where: {
          reviewedById: id,
          reviewedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.productionBatch.count({
        where: {
          verifiedById: id,
          verifiedAt: { gte: thirtyDaysAgo }
        }
      })
    ]);

    const applicationsReviewed = manufacturingAppsReviewed + distributionAppsReviewed + retailAppsReviewed;

    res.json({
      success: true,
      data: {
        recentLogins,
        applicationsReviewed,
        reviewedBreakdown: {
          manufacturing: manufacturingAppsReviewed,
          distribution: distributionAppsReviewed,
          retail: retailAppsReviewed
        },
        licensesReviewed,
        paymentsVerified,
        stampRequestsReviewed,
        batchesVerified,
        lastLoginAt: existingOfficer.lastLoginAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOfficer,
  getOfficers,
  getOfficerById,
  updateOfficer,
  updateOfficerStatus,
  resetOfficerPassword,
  uploadOfficerProfileImage,
  getOfficerActivitySummary
};
