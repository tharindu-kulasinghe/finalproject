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
  DistributionOrderStatus,
} = require('@prisma/client');
const bcrypt = require('bcryptjs');

const validateManufacturersForDistribution = async (manufacturerIds) => {
  if (!Array.isArray(manufacturerIds) || manufacturerIds.length === 0) {
    throw ApiError.badRequest('manufacturerIds is required and must contain at least one manufacturer');
  }

  const normalizedIds = [...new Set(manufacturerIds.filter(Boolean))];
  if (!normalizedIds.length) {
    throw ApiError.badRequest('manufacturerIds is required and must contain at least one manufacturer');
  }

  const now = new Date();
  const manufacturers = await prisma.user.findMany({
    where: { id: { in: normalizedIds } },
    include: {
      licenses: {
        where: {
          type: LicenseType.MANUFACTURING,
          status: LicenseStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
        },
        take: 1
      }
    }
  });

  if (manufacturers.length !== normalizedIds.length) {
    throw ApiError.badRequest('One or more selected manufacturers are invalid');
  }

  const invalidRole = manufacturers.find((item) => item.role !== UserRole.MANUFACTURER);
  if (invalidRole) {
    throw ApiError.badRequest('One or more selected manufacturers are invalid');
  }

  const inactive = manufacturers.find((item) => !item.licenses.length);
  if (inactive) {
    throw ApiError.badRequest('One or more selected manufacturers do not have an active manufacturing license');
  }

  return normalizedIds;
};

const RETAIL_LICENSE_TYPES = [
  LicenseType.RETAIL,
  LicenseType.BAR,
  LicenseType.RESTAURANT,
  LicenseType.HOTEL,
  LicenseType.CLUB
];

const validateRetailersForDistribution = async (retailerIds) => {
  if (!Array.isArray(retailerIds) || retailerIds.length === 0) {
    throw ApiError.badRequest('retailerIds is required and must contain at least one retailer');
  }

  const normalizedIds = [...new Set(retailerIds.filter(Boolean))];
  if (!normalizedIds.length) {
    throw ApiError.badRequest('retailerIds is required and must contain at least one retailer');
  }

  const now = new Date();
  const retailers = await prisma.user.findMany({
    where: { id: { in: normalizedIds } },
    include: {
      licenses: {
        where: {
          type: { in: RETAIL_LICENSE_TYPES },
          status: LicenseStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
        },
        take: 1
      }
    }
  });

  if (retailers.length !== normalizedIds.length) {
    throw ApiError.badRequest('One or more selected retailers are invalid');
  }

  const invalidRole = retailers.find((item) => item.role !== UserRole.RETAILER);
  if (invalidRole) {
    throw ApiError.badRequest('One or more selected retailers are invalid');
  }

  const inactive = retailers.find((item) => !item.licenses.length);
  if (inactive) {
    throw ApiError.badRequest('One or more selected retailers do not have an active retail license');
  }

  return normalizedIds;
};

const createDistributor = async (req, res, next) => {
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
      businessRegistrationNo,
      taxIdentificationNo,
      warehouseAddress,
      premisesOwnershipType,
      deedOrLeaseReference,
      buildingPlanReference,
      packingListDetails,
      oicCertificationRef,
      warehouseCapacity,
      transportDetails,
      distributionScope,
      manufacturerIds,
      retailerIds,
      remarks,
      applicationStatus = LicenseApplicationStatus.SUBMITTED,
    } = req.body;

    if (!fullName || !email || !password || !companyName || !businessName || !warehouseAddress || !district || !province || !premisesOwnershipType) {
      throw ApiError.badRequest('Required fields: fullName, email, password, companyName, businessName, warehouseAddress, district, province, premisesOwnershipType, manufacturerIds, retailerIds');
    }

    const validManufacturerIds = await validateManufacturersForDistribution(manufacturerIds);
    const validRetailerIds = await validateRetailersForDistribution(retailerIds);

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
          role: UserRole.DISTRIBUTOR,
          status: UserStatus.PENDING,
          district,
          province,
          notes
        }
      });

      const applicationCount = await prisma.distributionApplication.count();
      const applicationNo = `DIST-APP-${String(applicationCount + 1).padStart(5, '0')}`;

      const distributionApplication = await prisma.distributionApplication.create({
        data: {
          applicationNo,
          businessName,
          applicantName: applicantName || fullName,
          applicantEmail: applicantEmail || email,
          applicantPhone: applicantPhone || mobile,
          businessRegistrationNo,
          taxIdentificationNo,
          warehouseAddress,
          district,
          province,
          premisesOwnershipType,
          deedOrLeaseReference,
          buildingPlanReference,
          packingListDetails,
          oicCertificationRef,
          warehouseCapacity,
          transportDetails,
          distributionScope,
          status: applicationStatus,
          remarks,
          submittedById: user.id,
          submittedAt: new Date()
        }
      });

      await prisma.distributionApplicationManufacturer.createMany({
        data: validManufacturerIds.map((manufacturerId) => ({
          distributionApplicationId: distributionApplication.id,
          manufacturerId
        }))
      });

      await prisma.distributionApplicationRetailer.createMany({
        data: validRetailerIds.map((retailerId) => ({
          distributionApplicationId: distributionApplication.id,
          retailerId
        }))
      });

      return { user, distributionApplication };
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: result.user.id,
      description: `Created distributor: ${result.user.fullName} (${result.user.email})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'DistributionApplication',
      entityId: result.distributionApplication.id,
      description: `Created distributor license application: ${result.distributionApplication.applicationNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, result, 'Distributor created successfully');
  } catch (error) {
    next(error);
  }
};

const createDistributorApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      businessName,
      businessRegistrationNo,
      taxIdentificationNo,
      warehouseAddress,
      district,
      province,
      premisesOwnershipType,
      deedOrLeaseReference,
      buildingPlanReference,
      packingListDetails,
      oicCertificationRef,
      warehouseCapacity,
      transportDetails,
      distributionScope,
      manufacturerIds,
      retailerIds,
      applicationStatus = LicenseApplicationStatus.SUBMITTED,
      remarks,
    } = req.body;

    if (req.user?.role === UserRole.DISTRIBUTOR && req.user.id !== id) {
      throw ApiError.forbidden('You can only create applications for your own account');
    }

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR }
    });

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    if (!businessName || !warehouseAddress || !district || !province || !premisesOwnershipType) {
      throw ApiError.badRequest('Business name, warehouse address, district, province, premises ownership type, manufacturerIds and retailerIds are required');
    }

    const validManufacturerIds = await validateManufacturersForDistribution(manufacturerIds);
    const validRetailerIds = await validateRetailersForDistribution(retailerIds);

    const appCount = await prisma.distributionApplication.count();
    const applicationNo = `DIST-APP-${String(appCount + 1).padStart(5, '0')}`;

    const application = await prisma.distributionApplication.create({
      data: {
        applicationNo,
        applicantName: applicantName || distributor.fullName,
        applicantEmail: applicantEmail || distributor.email,
        applicantPhone: applicantPhone || distributor.mobile,
        businessName,
        businessRegistrationNo,
        taxIdentificationNo,
        warehouseAddress,
        district,
        province,
        premisesOwnershipType,
        deedOrLeaseReference,
        buildingPlanReference,
        packingListDetails,
        oicCertificationRef,
        warehouseCapacity,
        transportDetails,
        distributionScope,
        status: applicationStatus,
        remarks,
        submittedAt: new Date(),
        submittedById: id,
      }
    });

    await prisma.distributionApplicationManufacturer.createMany({
      data: validManufacturerIds.map((manufacturerId) => ({
        distributionApplicationId: application.id,
        manufacturerId
      }))
    });

    await prisma.distributionApplicationRetailer.createMany({
      data: validRetailerIds.map((retailerId) => ({
        distributionApplicationId: application.id,
        retailerId
      }))
    });

    return ApiResponse.created(res, application, 'Distributor application added successfully');
  } catch (error) {
    next(error);
  }
};

const getDistributors = async (req, res, next) => {
  try {
    const { status, district, province } = req.query;

    const where = {
      role: UserRole.DISTRIBUTOR
    };

    if (status) {
      where.status = status;
    }

    if (district) {
      where.district = district;
    }

    if (province) {
      where.province = province;
    }

    const distributors = await prisma.user.findMany({
      where,
      include: {
        licenses: {
          where: { type: LicenseType.DISTRIBUTION },
          select: { id: true, licenseNumber: true, status: true }
        },
        submittedDistributionApps: {
          select: { id: true, applicationNo: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, distributors, 'Distributors retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getDistributorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR },
      include: {
        licenses: {
          where: { type: LicenseType.DISTRIBUTION },
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
        submittedDistributionApps: {
          select: {
            id: true,
            applicationNo: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            remarks: true
          }
        },
        distributorStocks: {
          include: {
            product: {
              select: { id: true, code: true, name: true, category: true }
            }
          }
        },
        sentDistributions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            receiver: {
              select: { id: true, fullName: true, companyName: true }
            },
            product: {
              select: { id: true, code: true, name: true }
            }
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

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    return ApiResponse.success(res, distributor, 'Distributor retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateDistributor = async (req, res, next) => {
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

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR }
    });

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    const updatedDistributor = await prisma.user.update({
      where: { id },
      data: {
        fullName,
        mobile,
        companyName,
        nic,
        address,
        district,
        province,
        notes
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Updated distributor: ${distributor.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedDistributor, 'Distributor updated successfully');
  } catch (error) {
    next(error);
  }
};

const updateDistributorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(UserStatus).includes(status)) {
      throw ApiError.badRequest('Valid status is required');
    }

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR }
    });

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    const updatedDistributor = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Updated distributor status: ${distributor.fullName} -> ${status}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedDistributor, 'Distributor status updated successfully');
  } catch (error) {
    next(error);
  }
};

const resetDistributorPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters');
    }

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR }
    });

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedDistributor = await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Reset password for distributor: ${distributor.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, { id: updatedDistributor.id }, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

const updateDistributorApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !Object.values(LicenseApplicationStatus).includes(status)) {
      throw ApiError.badRequest('Valid application status is required');
    }

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR }
    });

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    const { applicationId } = req.body;

    const appWhere = { submittedById: id };
    if (applicationId) appWhere.id = applicationId;

    const application = await prisma.distributionApplication.findFirst({
      where: {
        ...appWhere
      }
    });

    if (!application) {
      throw ApiError.notFound('License application not found');
    }

    const updatedApplication = await prisma.distributionApplication.update({
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
      entityType: 'DistributionApplication',
      entityId: application.id,
      description: `Updated distributor application status: ${application.applicationNo} -> ${status}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedApplication, 'Application updated successfully');
  } catch (error) {
    next(error);
  }
};

const getDistributorLicenseApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user?.role === UserRole.DISTRIBUTOR && req.user.id !== id) {
      throw ApiError.forbidden('You can only view your own applications');
    }

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR }
    });

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    const applications = await prisma.distributionApplication.findMany({
      where: {
        submittedById: id
      },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
          select: { id: true, fullName: true, email: true, companyName: true }
        },
        selectedManufacturers: {
          include: {
            manufacturer: {
              select: { id: true, fullName: true, companyName: true, email: true }
            }
          }
        },
        selectedRetailers: {
          include: {
            retailer: {
              select: {
                id: true,
                fullName: true,
                companyName: true,
                email: true,
                mobile: true
              }
            }
          }
        },
        reviewedBy: {
          select: { id: true, fullName: true, email: true }
        },
        issuedLicense: {
          select: { id: true, licenseNumber: true, status: true }
        }
      }
    });

    if (!applications.length) {
      throw ApiError.notFound('License application not found');
    }

    const latestApplication = applications[0];
    return ApiResponse.success(
      res,
      { ...latestApplication, allApplications: applications },
      'Distribution applications retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

const issueDistributorLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { effectiveTo } = req.body;

    const distributor = await prisma.user.findUnique({
      where: { id, role: UserRole.DISTRIBUTOR }
    });

    if (!distributor) {
      throw ApiError.notFound('Distributor not found');
    }

    const { applicationId } = req.body;

    const appWhere = {
      submittedById: id,
      status: LicenseApplicationStatus.APPROVED
    };
    if (applicationId) appWhere.id = applicationId;

    const application = await prisma.distributionApplication.findFirst({
      where: appWhere,
      orderBy: { createdAt: 'desc' }
    });

    if (!application) {
      throw ApiError.badRequest('No approved license application found for this distributor');
    }

    const licenseCount = await prisma.license.count();
    const licenseNumber = `DIST-LIC-${Date.now()}-${licenseCount + 1}`;

    const license = await prisma.license.create({
      data: {
        licenseNumber,
        type: LicenseType.DISTRIBUTION,
        status: LicenseStatus.ACTIVE,
        companyName: application.businessName,
        businessAddress: application.warehouseAddress,
        taxIdentificationNo: application.taxIdentificationNo,
        holderId: id,
        distributionApplicationId: application.id,
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
      description: `Issued distributor license: ${license.licenseNumber} to ${distributor.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, license, 'License issued successfully');
  } catch (error) {
    next(error);
  }
};

const getAvailableRetailersForDistributor = async (req, res, next) => {
  try {
    const retailers = await prisma.user.findMany({
      where: {
        role: UserRole.RETAILER,
        status: UserStatus.ACTIVE
      },
      include: {
        licenses: {
          where: {
            type: { in: RETAIL_LICENSE_TYPES },
            status: LicenseStatus.ACTIVE,
            effectiveFrom: { lte: new Date() },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }]
          },
          take: 1,
          orderBy: { effectiveTo: 'desc' }
        }
      }
    });

    
    const availableRetailers = retailers.filter(r => r.licenses.length > 0)
      .map(r => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        companyName: r.companyName,
        mobile: r.mobile,
        address: r.address,
        license: r.licenses[0]
      }));

    return ApiResponse.success(res, availableRetailers, 'Available retailers fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getDistributorStock = async (req, res, next) => {
  try {
    const distributorId = req.user.id;

    const [incomingReceived, outgoingReceived, outgoingReserved, storedStock] = await Promise.all([
      prisma.distributionOrder.groupBy({
        by: ['productId'],
        where: {
          receiverId: distributorId,
          status: DistributionOrderStatus.RECEIVED
        },
        _sum: { quantity: true }
      }),
      prisma.distributionOrder.groupBy({
        by: ['productId'],
        where: {
          senderId: distributorId,
          status: DistributionOrderStatus.RECEIVED
        },
        _sum: { quantity: true }
      }),
      prisma.distributionOrder.groupBy({
        by: ['productId'],
        where: {
          senderId: distributorId,
          status: { in: [DistributionOrderStatus.PENDING, DistributionOrderStatus.DISPATCHED] }
        },
        _sum: { quantity: true }
      }),
      prisma.distributorStock.findMany({
        where: { distributorId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
              packType: true,
              packSizeMl: true
            }
          }
        }
      })
    ]);

    const incomingMap = incomingReceived.reduce((acc, row) => {
      acc[row.productId] = Number(row._sum.quantity || 0);
      return acc;
    }, {});

    const outgoingReceivedMap = outgoingReceived.reduce((acc, row) => {
      acc[row.productId] = Number(row._sum.quantity || 0);
      return acc;
    }, {});

    const outgoingReservedMap = outgoingReserved.reduce((acc, row) => {
      acc[row.productId] = Number(row._sum.quantity || 0);
      return acc;
    }, {});

    const storedStockByProductId = storedStock.reduce((acc, row) => {
      acc[row.productId] = row;
      return acc;
    }, {});

    const productIds = Array.from(new Set([
      ...Object.keys(incomingMap),
      ...Object.keys(outgoingReceivedMap),
      ...Object.keys(outgoingReservedMap),
      ...storedStock.map((row) => row.productId)
    ]));

    const products = productIds.length
      ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
          packType: true,
          packSizeMl: true
        }
      })
      : [];

    const productById = products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    const stock = productIds
      .map((productId) => {
        const receivedQty = Number(incomingMap[productId] || 0);
        const sentQty = Number(outgoingReceivedMap[productId] || 0);
        const reservedQty = Number(outgoingReservedMap[productId] || 0);
        const hasFlow = receivedQty > 0 || sentQty > 0 || reservedQty > 0;

        const storedRow = storedStockByProductId[productId];
        const availableQuantity = hasFlow
          ? Math.max(receivedQty - sentQty - reservedQty, 0)
          : Number(storedRow?.availableQuantity || 0);
        const effectiveReservedQuantity = hasFlow
          ? reservedQty
          : Number(storedRow?.reservedQuantity || 0);

        return {
          id: storedRow?.id || `derived-${distributorId}-${productId}`,
          distributorId,
          productId,
          availableQuantity,
          reservedQuantity: effectiveReservedQuantity,
          updatedAt: storedRow?.updatedAt || new Date(),
          product: storedRow?.product || productById[productId] || null
        };
      })
      .filter((item) => item.availableQuantity > 0 || item.reservedQuantity > 0)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return ApiResponse.success(res, stock, 'Distributor stock fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getAvailableDistributorsForRetailer = async (req, res, next) => {
  try {
    const distributors = await prisma.user.findMany({
      where: {
        role: UserRole.DISTRIBUTOR,
        status: UserStatus.ACTIVE
      },
      include: {
        licenses: {
          where: {
            type: { in: [LicenseType.DISTRIBUTION, LicenseType.WAREHOUSE] },
            status: LicenseStatus.ACTIVE,
            effectiveFrom: { lte: new Date() },
            effectiveTo: { gte: new Date() }
          },
          take: 1,
          orderBy: { effectiveTo: 'desc' }
        }
      }
    });

    
    const availableDistributors = distributors.filter(d => d.licenses.length > 0)
      .map(d => ({
        id: d.id,
        fullName: d.fullName,
        email: d.email,
        companyName: d.companyName,
        mobile: d.mobile,
        address: d.address,
        license: d.licenses[0]
      }));

    return ApiResponse.success(res, availableDistributors, 'Available distributors fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getActiveDistributors = async (req, res, next) => {
  try {
    const now = new Date();

    const distributors = await prisma.user.findMany({
      where: {
        role: UserRole.DISTRIBUTOR,
        licenses: {
          some: {
            type: LicenseType.DISTRIBUTION,
            status: LicenseStatus.ACTIVE,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
          }
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        companyName: true,
        address: true,
        district: true,
        province: true,
        licenses: {
          where: {
            type: LicenseType.DISTRIBUTION,
            status: LicenseStatus.ACTIVE,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
          },
          select: {
            id: true,
            licenseNumber: true,
            effectiveFrom: true,
            effectiveTo: true
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1
        }
      },
      orderBy: { companyName: 'asc' }
    });

    return ApiResponse.success(res, distributors, 'Active distributors fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDistributor,
  createDistributorApplication,
  getDistributors,
  getDistributorById,
  updateDistributor,
  updateDistributorStatus,
  resetDistributorPassword,
  updateDistributorApplication,
  getDistributorLicenseApplication,
  issueDistributorLicense,
  getActiveDistributors,
  getAvailableRetailersForDistributor,
  getDistributorStock,
  getAvailableDistributorsForRetailer
};