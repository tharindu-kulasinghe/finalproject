const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const {
  UserRole,
  LicenseType,
  LicenseStatus,
  UserStatus,
  ApplicationStatus: LicenseApplicationStatus,
} = require('@prisma/client');
const bcrypt = require('bcryptjs');

const generateRandomPassword = () => Math.random().toString(36).slice(-8);

const validateRetailDistributors = async (distributorIds) => {
  if (distributorIds === undefined || distributorIds === null) {
    return [];
  }

  if (!Array.isArray(distributorIds)) {
    throw ApiError.badRequest('distributorIds must be an array');
  }

  const ids = [...new Set(distributorIds.filter(Boolean))];
  if (!ids.length) {
    return [];
  }

  const now = new Date();
  const distributors = await prisma.user.findMany({
    where: {
      id: { in: ids },
      role: UserRole.DISTRIBUTOR
    },
    include: {
      licenses: {
        where: {
          type: LicenseType.DISTRIBUTION,
          status: LicenseStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
        },
        take: 1
      }
    }
  });

  if (distributors.length !== ids.length) {
    throw ApiError.badRequest('One or more selected distributors are invalid');
  }

  const withoutLicense = distributors.find((d) => d.licenses.length === 0);
  if (withoutLicense) {
    throw ApiError.badRequest('One or more selected distributors do not have an active distribution license');
  }

  return ids;
};

const createRetailer = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      mobile,
      password,
      companyName,
      nic,
      address,
      district,
      province,
      notes,
      applicantName,
      applicantEmail,
      applicantPhone,
      businessName,
      businessAddress,
      outletType,
      taxIdentificationNo,
      premisesOwnershipType,
      deedOrLeaseReference,
      touristBoardApprovalRef,
      filmCorporationApprovalRef,
      clubApprovalRef,
      tradeLicenseRef,
      liquorSaleMode,
      seatingCapacity,
      distributorIds,
      applicationStatus = LicenseApplicationStatus.SUBMITTED,
      remarks,
    } = req.body;

    if (!fullName || !email || !password || !companyName || !businessName || !businessAddress || !district || !province || !outletType || !premisesOwnershipType) {
      throw ApiError.badRequest('Required fields: fullName, email, password, companyName, businessName, businessAddress, district, province, outletType, premisesOwnershipType');
    }

    const validatedDistributorIds = await validateRetailDistributors(distributorIds);

    const validRetailLicenseTypes = [
      LicenseType.RETAIL,
      LicenseType.BAR,
      LicenseType.RESTAURANT,
      LicenseType.HOTEL,
      LicenseType.CLUB
    ];

    if (!validRetailLicenseTypes.includes(outletType)) {
      throw ApiError.badRequest('Invalid license type for retailer');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { mobile: mobile || '' }
        ]
      }
    });

    if (existingUser) {
      throw ApiError.badRequest('User with this email or mobile already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          mobile,
          passwordHash,
          companyName,
          nic,
          address,
          role: UserRole.RETAILER,
          status: UserStatus.PENDING,
          district,
          province,
          notes
        }
      });

      const applicationCount = await prisma.retailApplication.count();
      const applicationNo = `RTL-APP-${String(applicationCount + 1).padStart(5, '0')}`;

      const retailApplicationData = {
        applicationNo,
        applicantName: applicantName || fullName,
        applicantEmail: applicantEmail || email,
        applicantPhone: applicantPhone || mobile,
        businessName,
        businessAddress,
        district,
        province,
        outletType,
        taxIdentificationNo,
        premisesOwnershipType,
        deedOrLeaseReference,
        touristBoardApprovalRef,
        filmCorporationApprovalRef,
        clubApprovalRef,
        tradeLicenseRef,
        liquorSaleMode,
        seatingCapacity,
        status: applicationStatus,
        remarks,
        submittedById: user.id,
        submittedAt: new Date()
      };

      if (validatedDistributorIds.length) {
        retailApplicationData.selectedDistributors = {
          createMany: {
            data: validatedDistributorIds.map((distributorId) => ({ distributorId }))
          }
        };
      }

      const retailApplication = await prisma.retailApplication.create({
        data: retailApplicationData
      });

      return { user, retailApplication };
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: result.user.id,
      description: `Created retailer: ${result.user.fullName} (${result.user.email}) with outlet type: ${outletType}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'RetailApplication',
      entityId: result.retailApplication.id,
      description: `Created retailer license application: ${result.retailApplication.applicationNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, result, 'Retailer created successfully');
  } catch (error) {
    next(error);
  }
};

const createRetailerApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (currentUserRole === UserRole.RETAILER && currentUserId !== id) {
      throw ApiError.forbidden('You can only create your own retail application');
    }

    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      businessName,
      businessAddress,
      district,
      province,
      outletType,
      taxIdentificationNo,
      premisesOwnershipType,
      deedOrLeaseReference,
      touristBoardApprovalRef,
      filmCorporationApprovalRef,
      clubApprovalRef,
      tradeLicenseRef,
      liquorSaleMode,
      seatingCapacity,
      distributorIds,
      applicationStatus = LicenseApplicationStatus.SUBMITTED,
      remarks,
    } = req.body;

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    if (!businessName || !businessAddress || !district || !province || !outletType || !premisesOwnershipType) {
      throw ApiError.badRequest('Business name, business address, district, province, outlet type and premises ownership type are required');
    }

    const validatedDistributorIds = await validateRetailDistributors(distributorIds);

    const appCount = await prisma.retailApplication.count();
    const applicationNo = `RTL-APP-${String(appCount + 1).padStart(5, '0')}`;

    const applicationData = {
      applicationNo,
      applicantName: applicantName || retailer.fullName,
      applicantEmail: applicantEmail || retailer.email,
      applicantPhone: applicantPhone || retailer.mobile,
      businessName,
      businessAddress,
      district,
      province,
      outletType,
      taxIdentificationNo,
      premisesOwnershipType,
      deedOrLeaseReference,
      touristBoardApprovalRef,
      filmCorporationApprovalRef,
      clubApprovalRef,
      tradeLicenseRef,
      liquorSaleMode,
      seatingCapacity,
      status: applicationStatus,
      remarks,
      submittedAt: new Date(),
      submittedById: id,
    };

    if (validatedDistributorIds.length) {
      applicationData.selectedDistributors = {
        createMany: {
          data: validatedDistributorIds.map((distributorId) => ({ distributorId }))
        }
      };
    }

    const application = await prisma.retailApplication.create({
      data: applicationData,
    });

    return ApiResponse.created(res, application, 'Retail application added successfully');
  } catch (error) {
    next(error);
  }
};

const getRetailers = async (req, res, next) => {
  try {
    const { search, status, district, province, licenseType, applicationStatus } = req.query;

    const where = {
      role: UserRole.RETAILER
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (district) {
      where.district = { contains: district, mode: 'insensitive' };
    }

    if (province) {
      where.province = province;
    }

    const retailers = await prisma.user.findMany({
      where,
      include: {
        licenses: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            licenseNumber: true,
            type: true,
            status: true,
            effectiveFrom: true,
            effectiveTo: true
          }
        },
        submittedRetailApps: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            applicationNo: true,
            outletType: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let filteredRetailers = retailers;

    if (applicationStatus) {
      filteredRetailers = filteredRetailers.filter((retailer) =>
        retailer.submittedRetailApps[0]?.status === applicationStatus
      );
    }

    if (licenseType) {
      filteredRetailers = filteredRetailers.filter((retailer) =>
        retailer.licenses.some((license) => license.type === licenseType)
      );
    }

    return ApiResponse.success(res, filteredRetailers, 'Retailers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getRetailerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER },
      include: {
        licenses: {
          select: {
            id: true,
            licenseNumber: true,
            type: true,
            status: true,
            issueDate: true,
            effectiveFrom: true,
            effectiveTo: true
          }
        },
        submittedRetailApps: {
          select: {
            id: true,
            applicationNo: true,
            businessName: true,
            outletType: true,
            status: true,
            submittedAt: true,
            createdAt: true,
            reviewedAt: true,
            remarks: true
          }
        },
        receivedDistributions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, fullName: true, companyName: true }
            },
            product: {
              select: { id: true, code: true, name: true }
            }
          }
        }
      }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    return ApiResponse.success(res, retailer, 'Retailer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateRetailer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      mobile,
      companyName,
      nic,
      address,
      district,
      province,
      notes
    } = req.body;

    const normalizedMobile = typeof mobile === 'string' ? mobile.trim() : mobile;
    const normalizedNic = typeof nic === 'string' ? nic.trim() : nic;
    const normalizedFullName = typeof fullName === 'string' ? fullName.trim() : fullName;
    const normalizedCompanyName = typeof companyName === 'string' ? companyName.trim() : companyName;
    const normalizedDistrict = typeof district === 'string' ? district.trim() : district;
    const normalizedProvince = typeof province === 'string' ? province.trim() : province;
    const mobileValue = normalizedMobile || null;
    const nicValue = normalizedNic || null;

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    if (!normalizedFullName || !normalizedCompanyName || !normalizedDistrict || !normalizedProvince) {
      throw ApiError.badRequest('Full name, company name, district and province are required');
    }

    if (mobileValue && mobileValue !== retailer.mobile) {
      const existingMobileUser = await prisma.user.findFirst({
        where: {
          mobile: mobileValue,
          NOT: { id }
        }
      });

      if (existingMobileUser) {
        throw ApiError.badRequest('Mobile number already in use');
      }
    }

    if (nicValue && nicValue !== retailer.nic) {
      const existingNicUser = await prisma.user.findFirst({
        where: {
          nic: nicValue,
          NOT: { id }
        }
      });

      if (existingNicUser) {
        throw ApiError.badRequest('NIC already in use');
      }
    }

    const updatedRetailer = await prisma.user.update({
      where: { id },
      data: {
        fullName: normalizedFullName,
        mobile: mobileValue,
        companyName: normalizedCompanyName,
        nic: nicValue,
        address,
        district: normalizedDistrict,
        province: normalizedProvince,
        notes
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Updated retailer: ${retailer.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedRetailer, 'Retailer updated successfully');
  } catch (error) {
    next(error);
  }
};

const updateRetailerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(UserStatus).includes(status)) {
      throw ApiError.badRequest('Valid status is required');
    }

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    const updatedRetailer = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Updated retailer status: ${retailer.fullName} -> ${status}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedRetailer, 'Retailer status updated successfully');
  } catch (error) {
    next(error);
  }
};

const resetRetailerPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    const resolvedPassword = newPassword || generateRandomPassword();

    if (resolvedPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters');
    }

    const passwordHash = await bcrypt.hash(resolvedPassword, 10);

    const updatedRetailer = await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Reset password for retailer: ${retailer.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(
      res,
      { id: updatedRetailer.id, message: 'Password reset successfully. New password has been generated.' },
      'Password reset successfully'
    );
  } catch (error) {
    next(error);
  }
};

const updateRetailerApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !Object.values(LicenseApplicationStatus).includes(status)) {
      throw ApiError.badRequest('Valid application status is required');
    }

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    const { applicationId } = req.body;

    const appWhere = { submittedById: id };
    if (applicationId) appWhere.id = applicationId;

    const application = await prisma.retailApplication.findFirst({
      where: {
        ...appWhere
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!application) {
      throw ApiError.notFound('License application not found');
    }

    const updatedApplication = await prisma.retailApplication.update({
      where: { id: application.id },
      data: {
        status,
        remarks,
        reviewedById: req.user.id,
        reviewedAt: new Date()
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'RetailApplication',
      entityId: application.id,
      description: `Updated retailer application status: ${application.applicationNo} -> ${status}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedApplication, 'Application updated successfully');
  } catch (error) {
    next(error);
  }
};

const getRetailerLicenseApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (currentUserRole === UserRole.RETAILER && currentUserId !== id) {
      throw ApiError.forbidden('You can only view your own retail applications');
    }

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    const applications = await prisma.retailApplication.findMany({
      where: {
        submittedById: id
      },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
          select: { id: true, fullName: true, email: true, companyName: true }
        },
        selectedDistributors: {
          include: {
            distributor: {
              select: { id: true, fullName: true, companyName: true, email: true, mobile: true, address: true }
            }
          }
        },
        reviewedBy: {
          select: { id: true, fullName: true, email: true }
        },
        issuedLicense: {
          select: {
            id: true,
            licenseNumber: true,
            status: true,
            issueDate: true,
            effectiveFrom: true,
            effectiveTo: true
          }
        },
        files: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!applications.length) {
      return ApiResponse.success(
        res,
        { allApplications: [] },
        'Retail applications retrieved successfully'
      );
    }

    const latestApplication = applications[0];
    return ApiResponse.success(
      res,
      { ...latestApplication, allApplications: applications },
      'Retail applications retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

const issueRetailerLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { effectiveTo } = req.body;

    const retailer = await prisma.user.findUnique({
      where: { id, role: UserRole.RETAILER }
    });

    if (!retailer) {
      throw ApiError.notFound('Retailer not found');
    }

    const { applicationId } = req.body;

    const appWhere = {
      submittedById: id,
      status: LicenseApplicationStatus.APPROVED
    };
    if (applicationId) appWhere.id = applicationId;

    const application = await prisma.retailApplication.findFirst({
      where: appWhere,
      orderBy: { createdAt: 'desc' }
    });

    if (!application) {
      throw ApiError.badRequest('No approved license application found for this retailer');
    }

    const existingForApplication = await prisma.license.findFirst({
      where: { retailApplicationId: application.id }
    });

    if (existingForApplication) {
      throw ApiError.badRequest('This retail application already has an issued license');
    }

    const licenseCount = await prisma.license.count();
    const licenseNumber = `RET-LIC-${Date.now()}-${licenseCount + 1}`;

    const license = await prisma.license.create({
      data: {
        licenseNumber,
        type: application.outletType,
        status: LicenseStatus.ACTIVE,
        companyName: application.businessName,
        businessAddress: application.businessAddress,
        taxIdentificationNo: application.taxIdentificationNo,
        holderId: id,
        retailApplicationId: application.id,
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'License',
      entityId: license.id,
      description: `Issued retailer license: ${license.licenseNumber} (${license.type}) to ${retailer.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, license, 'License issued successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRetailer,
  createRetailerApplication,
  getRetailers,
  getRetailerById,
  updateRetailer,
  updateRetailerStatus,
  resetRetailerPassword,
  getRetailerLicenseApplication,
  updateRetailerApplication,
  issueRetailerLicense
};