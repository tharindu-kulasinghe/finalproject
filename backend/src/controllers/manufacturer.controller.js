const prisma = require('../prisma/client');
const { hashPassword } = require('../utils/hash');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const {
  UserRole,
  LicenseType,
  ApplicationStatus: LicenseApplicationStatus,
  UserStatus,
  LicenseStatus,
} = require('@prisma/client');

const createManufacturer = async (req, res, next) => {
  try {
    const {
      
      fullName,
      email,
      password,
      companyName,
      nic,
      address,
      mobile,
      status = UserStatus.PENDING,
      district,
      province,
      notes,
      
      
      applicantName,
      applicantEmail,
      applicantPhone,
      companyRegistrationNo,
      taxIdentificationNo,
      businessAddress,
      premisesOwnershipType,
      deedOrLeaseReference,
      productType,
      proposedProducts,
      manufacturingType,
      rawMaterialDetails,
      productionCapacity,
      environmentalApprovalRef,
      fireSafetyApprovalRef,
      otherGovernmentApprovals,
      applicationStatus = LicenseApplicationStatus.DRAFT,
      remarks
    } = req.body;

    const normalizedProposedProducts = Array.isArray(proposedProducts) ? proposedProducts : [];
    if (proposedProducts !== undefined && !Array.isArray(proposedProducts)) {
      throw ApiError.badRequest('proposedProducts must be an array when provided');
    }
    if (normalizedProposedProducts.length !== 1) {
      throw ApiError.badRequest('Exactly one proposed product is required per license application');
    }
    if (normalizedProposedProducts.some((item) => !item?.category || !item?.name)) {
      throw ApiError.badRequest('Each proposed product must include category and name');
    }
    const derivedProductType = productType || [...new Set(normalizedProposedProducts.map((item) => item.category))].join(', ');

    if (!fullName || !email || !password) {
      throw ApiError.badRequest('Full name, email and password are required');
    }

    if (!companyName || !businessAddress || !district || !province || !premisesOwnershipType || !derivedProductType || !manufacturingType) {
      throw ApiError.badRequest('Company name, business address, district, province, premises ownership, product type and manufacturing type are required');
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

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          companyName,
          nic,
          address,
          mobile,
          role: UserRole.MANUFACTURER,
          status,
          district,
          province,
          notes
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

      const applicationCount = await tx.manufacturingApplication.count();
      const applicationNo = `MFG-APP-${String(applicationCount + 1).padStart(5, '0')}`;

      const manufacturingApplication = await tx.manufacturingApplication.create({
        data: {
          applicationNo,
          applicantName: applicantName || fullName,
          applicantEmail: applicantEmail || email,
          applicantPhone: applicantPhone || mobile,
          companyName,
          companyRegistrationNo,
          taxIdentificationNo,
          businessAddress,
          district,
          province,
          premisesOwnershipType,
          deedOrLeaseReference,
          productType: derivedProductType,
          proposedProductsJson: normalizedProposedProducts.length ? JSON.stringify(normalizedProposedProducts) : null,
          manufacturingType,
          rawMaterialDetails,
          productionCapacity,
          environmentalApprovalRef,
          fireSafetyApprovalRef,
          otherGovernmentApprovals,
          submittedById: user.id,
          status: applicationStatus,
          submittedAt: new Date(),
          remarks
        },
        include: {
          submittedBy: {
            select: { id: true, fullName: true, email: true }
          }
        }
      });

      return { user, manufacturingApplication };
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'Manufacturer',
      entityId: result.user.id,
      description: `Created manufacturer: ${result.user.email} with manufacturing application: ${result.manufacturingApplication.applicationNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, result, 'Manufacturer created successfully with license application');
  } catch (error) {
    next(error);
  }
};

const getManufacturers = async (req, res, next) => {
  try {
    const { search, status, applicationStatus, licenseStatus, district, province } = req.query;
    
    const where = {
      role: UserRole.MANUFACTURER
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

    const manufacturers = await prisma.user.findMany({
      where,
      include: {
        submittedManufacturingApps: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        licenses: {
          where: { type: LicenseType.MANUFACTURING },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    
    let filteredManufacturers = manufacturers;
    if (applicationStatus) {
      filteredManufacturers = manufacturers.filter(m => 
        m.submittedManufacturingApps[0]?.status === applicationStatus
      );
    }

    
    if (licenseStatus) {
      filteredManufacturers = filteredManufacturers.filter(m => 
        m.licenses[0]?.status === licenseStatus
      );
    }

    return ApiResponse.success(res, filteredManufacturers, 'Manufacturers fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getManufacturerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const manufacturer = await prisma.user.findUnique({
      where: {
        id,
        role: UserRole.MANUFACTURER
      },
      include: {
        submittedManufacturingApps: {
          orderBy: { createdAt: 'desc' },
          include: {
            submittedBy: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            reviewedBy: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            issuedLicense: {
              select: {
                id: true,
                licenseNumber: true,
                status: true,
                issueDate: true,
                effectiveFrom: true,
                effectiveTo: true,
                renewalDueDate: true
              }
            },
            files: {
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        licenses: {
          where: { type: LicenseType.MANUFACTURING },
          orderBy: { createdAt: 'desc' }
        },
        products: {
          orderBy: { createdAt: 'desc' },
          include: {
            license: {
              select: {
                id: true,
                licenseNumber: true,
                status: true,
                type: true
              }
            }
          }
        }
      }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    const latestApplication = manufacturer.submittedManufacturingApps?.[0] || null;
    const latestManufacturingLicense = manufacturer.licenses?.[0] || null;

    return ApiResponse.success(
      res,
      {
        ...manufacturer,
        manufacturingApplication: latestApplication,
        manufacturingLicense: latestManufacturingLicense
      },
      'Manufacturer fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

const updateManufacturer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      mobile,
      companyName,
      nic,
      address,
      status,
      district,
      province,
      notes
    } = req.body;

    const manufacturer = await prisma.user.findUnique({
      where: {
        id,
        role: UserRole.MANUFACTURER
      }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    
    if (email || mobile || nic) {
      const existingUser = await prisma.user.findFirst({
        where: {
          NOT: { id },
          OR: [
            ...(email ? [{ email }] : []),
            ...(mobile ? [{ mobile }] : []),
            ...(nic ? [{ nic }] : [])
          ]
        }
      });

      if (existingUser) {
        throw ApiError.conflict('User with this email, mobile or NIC already exists');
      }
    }

    const updatedManufacturer = await prisma.user.update({
      where: { id },
      data: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(mobile && { mobile }),
        ...(companyName && { companyName }),
        ...(nic && { nic }),
        ...(address && { address }),
        ...(status && { status }),
        ...(district && { district }),
        ...(province && { province }),
        ...(notes !== undefined && { notes })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'Manufacturer',
      entityId: id,
      description: `Updated manufacturer: ${manufacturer.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedManufacturer, 'Manufacturer updated successfully');
  } catch (error) {
    next(error);
  }
};

const updateManufacturerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw ApiError.badRequest('Status is required');
    }

    const manufacturer = await prisma.user.findUnique({
      where: {
        id,
        role: UserRole.MANUFACTURER
      }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    const updatedManufacturer = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        updatedAt: true
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_STATUS',
      entityType: 'Manufacturer',
      entityId: id,
      description: `Updated manufacturer status to ${status}: ${manufacturer.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedManufacturer, 'Manufacturer status updated successfully');
  } catch (error) {
    next(error);
  }
};

const resetManufacturerPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const manufacturer = await prisma.user.findUnique({
      where: {
        id,
        role: UserRole.MANUFACTURER
      }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    
    const randomPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await hashPassword(randomPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await logAudit({
      userId: req.user.id,
      action: 'RESET_PASSWORD',
      entityType: 'Manufacturer',
      entityId: id,
      description: `Reset password for manufacturer: ${manufacturer.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    
    return ApiResponse.success(res, { 
      message: 'Password reset successfully. New password has been generated.'
    }, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

const getManufacturerLicenseApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user?.role === UserRole.MANUFACTURER && req.user.id !== id) {
      throw ApiError.forbidden('You can only view your own applications');
    }

    const manufacturer = await prisma.user.findUnique({
      where: {
        id,
        role: UserRole.MANUFACTURER
      }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    const applications = await prisma.manufacturingApplication.findMany({
      where: { submittedById: id },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
          select: { id: true, fullName: true, email: true }
        },
        reviewedBy: {
          select: { id: true, fullName: true, email: true }
        },
        issuedLicense: {
          select: { id: true, licenseNumber: true, status: true, effectiveFrom: true, effectiveTo: true }
        },
      }
    });

    if (!applications.length) {
      throw ApiError.notFound('License application not found for this manufacturer');
    }

    const latestApplication = applications[0];
    return ApiResponse.success(
      res,
      { ...latestApplication, allApplications: applications },
      'Manufacturing applications fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

const createManufacturerApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      companyName,
      companyRegistrationNo,
      taxIdentificationNo,
      businessAddress,
      district,
      province,
      premisesOwnershipType,
      deedOrLeaseReference,
      productType,
      proposedProducts,
      manufacturingType,
      rawMaterialDetails,
      productionCapacity,
      environmentalApprovalRef,
      fireSafetyApprovalRef,
      otherGovernmentApprovals,
      applicationStatus = LicenseApplicationStatus.SUBMITTED,
      remarks,
    } = req.body;

    if (req.user?.role === UserRole.MANUFACTURER && req.user.id !== id) {
      throw ApiError.forbidden('You can only create applications for your own account');
    }

    const normalizedProposedProducts = Array.isArray(proposedProducts) ? proposedProducts : [];
    if (proposedProducts !== undefined && !Array.isArray(proposedProducts)) {
      throw ApiError.badRequest('proposedProducts must be an array when provided');
    }
    if (normalizedProposedProducts.length !== 1) {
      throw ApiError.badRequest('Exactly one proposed product is required per license application');
    }
    if (normalizedProposedProducts.some((item) => !item?.category || !item?.name)) {
      throw ApiError.badRequest('Each proposed product must include category and name');
    }
    const derivedProductType = productType || [...new Set(normalizedProposedProducts.map((item) => item.category))].join(', ');

    const manufacturer = await prisma.user.findUnique({
      where: { id, role: UserRole.MANUFACTURER }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    if (!companyName || !businessAddress || !district || !province || !premisesOwnershipType || !derivedProductType || !manufacturingType) {
      throw ApiError.badRequest('Company name, business address, district, province, premises ownership, product type and manufacturing type are required');
    }

    const appCount = await prisma.manufacturingApplication.count();
    const applicationNo = `MFG-APP-${String(appCount + 1).padStart(5, '0')}`;

    const application = await prisma.manufacturingApplication.create({
      data: {
        applicationNo,
        applicantName: applicantName || manufacturer.fullName,
        applicantEmail: applicantEmail || manufacturer.email,
        applicantPhone: applicantPhone || manufacturer.mobile,
        companyName,
        companyRegistrationNo,
        taxIdentificationNo,
        businessAddress,
        district,
        province,
        premisesOwnershipType,
        deedOrLeaseReference,
        productType: derivedProductType,
        proposedProductsJson: normalizedProposedProducts.length ? JSON.stringify(normalizedProposedProducts) : null,
        manufacturingType,
        rawMaterialDetails,
        productionCapacity,
        environmentalApprovalRef,
        fireSafetyApprovalRef,
        otherGovernmentApprovals,
        status: applicationStatus,
        submittedAt: new Date(),
        remarks,
        submittedById: id,
      },
    });

    return ApiResponse.created(res, application, 'Manufacturing application added successfully');
  } catch (error) {
    next(error);
  }
};

const updateManufacturerApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      applicationId,
      applicantName,
      applicantEmail,
      applicantPhone,
      companyName,
      companyRegistrationNo,
      district,
      province,
      premisesOwnershipType,
      deedOrLeaseReference,
      productType,
      proposedProducts,
      manufacturingType,
      rawMaterialDetails,
      productionCapacity,
      environmentalApprovalRef,
      fireSafetyApprovalRef,
      otherGovernmentApprovals,
      applicationStatus,
      businessName,
      businessAddress,
      contactEmail,
      contactPhone,
      taxIdentificationNo,
      status,
      remarks
    } = req.body;

    let normalizedProposedProducts;
    if (proposedProducts !== undefined) {
      if (!Array.isArray(proposedProducts)) {
        throw ApiError.badRequest('proposedProducts must be an array when provided');
      }
      if (proposedProducts.length !== 1) {
        throw ApiError.badRequest('Exactly one proposed product is required per license application');
      }
      if (proposedProducts.some((item) => !item?.category || !item?.name)) {
        throw ApiError.badRequest('Each proposed product must include category and name');
      }
      normalizedProposedProducts = proposedProducts;
    }

    const derivedProductType = normalizedProposedProducts
      ? (productType || [...new Set(normalizedProposedProducts.map((item) => item.category))].join(', '))
      : undefined;

    const manufacturer = await prisma.user.findUnique({
      where: {
        id,
        role: UserRole.MANUFACTURER
      }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    const where = { submittedById: id };
    if (applicationId) where.id = applicationId;

    const manufacturingApplication = await prisma.manufacturingApplication.findFirst({
      where,
      orderBy: { createdAt: 'desc' }
    });

    if (!manufacturingApplication) {
      throw ApiError.notFound('License application not found for this manufacturer');
    }

    const resolvedCompanyName = companyName ?? businessName ?? manufacturingApplication.companyName;
    const resolvedBusinessAddress = businessAddress ?? manufacturingApplication.businessAddress;
    const resolvedDistrict = district ?? manufacturingApplication.district;
    const resolvedProvince = province ?? manufacturingApplication.province;
    const resolvedPremisesOwnershipType = premisesOwnershipType ?? manufacturingApplication.premisesOwnershipType;
    const resolvedProductType = derivedProductType ?? productType ?? manufacturingApplication.productType;
    const resolvedManufacturingType = manufacturingType ?? manufacturingApplication.manufacturingType;

    if (!resolvedCompanyName || !resolvedBusinessAddress || !resolvedDistrict || !resolvedProvince || !resolvedPremisesOwnershipType || !resolvedProductType || !resolvedManufacturingType) {
      throw ApiError.badRequest('Company name, business address, district, province, premises ownership, product type and manufacturing type are required');
    }

    const resolvedApplicantEmail = applicantEmail ?? contactEmail;
    const resolvedApplicantPhone = applicantPhone ?? contactPhone;
    const resolvedApplicationStatus = applicationStatus ?? status;

    const updatedApplication = await prisma.manufacturingApplication.update({
      where: { id: manufacturingApplication.id },
      data: {
        ...(applicantName !== undefined && { applicantName }),
        ...(resolvedApplicantEmail !== undefined && { applicantEmail: resolvedApplicantEmail }),
        ...(resolvedApplicantPhone !== undefined && { applicantPhone: resolvedApplicantPhone }),
        ...(resolvedCompanyName !== undefined && { companyName: resolvedCompanyName }),
        ...(companyRegistrationNo !== undefined && { companyRegistrationNo }),
        ...(resolvedBusinessAddress !== undefined && { businessAddress: resolvedBusinessAddress }),
        ...(resolvedDistrict !== undefined && { district: resolvedDistrict }),
        ...(resolvedProvince !== undefined && { province: resolvedProvince }),
        ...(resolvedPremisesOwnershipType !== undefined && { premisesOwnershipType: resolvedPremisesOwnershipType }),
        ...(deedOrLeaseReference !== undefined && { deedOrLeaseReference }),
        ...(resolvedProductType !== undefined && { productType: resolvedProductType }),
        ...(normalizedProposedProducts !== undefined && { proposedProductsJson: JSON.stringify(normalizedProposedProducts) }),
        ...(resolvedManufacturingType !== undefined && { manufacturingType: resolvedManufacturingType }),
        ...(rawMaterialDetails !== undefined && { rawMaterialDetails }),
        ...(productionCapacity !== undefined && { productionCapacity }),
        ...(environmentalApprovalRef !== undefined && { environmentalApprovalRef }),
        ...(fireSafetyApprovalRef !== undefined && { fireSafetyApprovalRef }),
        ...(otherGovernmentApprovals !== undefined && { otherGovernmentApprovals }),
        ...(taxIdentificationNo !== undefined && { taxIdentificationNo }),
        ...(resolvedApplicationStatus !== undefined && { status: resolvedApplicationStatus }),
        ...(remarks !== undefined && { remarks })
      },
      include: {
        submittedBy: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_APPLICATION',
      entityType: 'Manufacturer',
      entityId: id,
      description: `Updated license application for manufacturer: ${manufacturer.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedApplication, 'License application updated successfully');
  } catch (error) {
    next(error);
  }
};

const issueManufacturerLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      licenseType = LicenseType.MANUFACTURING,
      effectiveFrom,
      effectiveTo,
      renewalDueDate
    } = req.body;

    const manufacturer = await prisma.user.findUnique({
      where: {
        id,
        role: UserRole.MANUFACTURER
      }
    });

    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found');
    }

    
    const { applicationId } = req.body;

    const appWhere = {
      submittedById: id,
      status: { in: [LicenseApplicationStatus.APPROVED, LicenseApplicationStatus.SUBMITTED] },
    };
    if (applicationId) appWhere.id = applicationId;

    const manufacturingApplication = await prisma.manufacturingApplication.findFirst({
      where: appWhere,
      orderBy: { createdAt: 'desc' }
    });

    if (!manufacturingApplication) {
      throw ApiError.badRequest('No eligible manufacturing application found (status must be SUBMITTED or APPROVED).');
    }

    if (manufacturingApplication.status !== LicenseApplicationStatus.APPROVED) {
      throw ApiError.badRequest('Selected application must be APPROVED before issuing a license.');
    }

    const existingForApplication = await prisma.license.findFirst({
      where: { manufacturingApplicationId: manufacturingApplication.id }
    });
    if (existingForApplication) {
      throw ApiError.badRequest('This application already has an issued license.');
    }

    
    const licenseCount = await prisma.license.count();
    const licenseNumber = `LIC-${LicenseType.MANUFACTURING}-${Date.now().toString().slice(-6)}-${licenseCount + 1}`;

    
    const license = await prisma.license.create({
      data: {
        licenseNumber,
        type: licenseType,
        holderId: id,
        companyName: manufacturingApplication.companyName,
        businessAddress: manufacturingApplication.businessAddress,
        taxIdentificationNo: manufacturingApplication.taxIdentificationNo,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        renewalDueDate: renewalDueDate ? new Date(renewalDueDate) : null,
        status: LicenseStatus.ACTIVE,
        manufacturingApplicationId: manufacturingApplication.id,
      },
      include: {
        holder: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    
    await prisma.manufacturingApplication.update({
      where: { id: manufacturingApplication.id },
      data: { status: LicenseApplicationStatus.APPROVED }
    });

    await logAudit({
      userId: req.user.id,
      action: 'ISSUE_LICENSE',
      entityType: 'Manufacturer',
      entityId: id,
      description: `Issued manufacturing license to: ${manufacturer.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, license, 'License issued successfully');
  } catch (error) {
    next(error);
  }
};

const getAvailableDistributors = async (req, res, next) => {
  try {
    const now = new Date();

    const distributorWhere = {
      role: UserRole.DISTRIBUTOR,
      status: UserStatus.ACTIVE,
      ...(req.user?.role === UserRole.MANUFACTURER
        ? {
            submittedDistributionApps: {
              some: {
                status: LicenseApplicationStatus.APPROVED,
                selectedManufacturers: {
                  some: {
                    manufacturerId: req.user.id
                  }
                }
              }
            }
          }
        : {})
    };

    const distributors = await prisma.user.findMany({
      where: distributorWhere,
      include: {
        licenses: {
          where: {
            type: { in: [LicenseType.DISTRIBUTION, LicenseType.WAREHOUSE] },
            status: LicenseStatus.ACTIVE,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
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

    const message = req.user?.role === UserRole.MANUFACTURER
      ? 'Linked distributors fetched successfully'
      : 'Available distributors fetched successfully';

    return ApiResponse.success(res, availableDistributors, message);
  } catch (error) {
    next(error);
  }
};

const getAvailableRetailers = async (req, res, next) => {
  try {
    const retailers = await prisma.user.findMany({
      where: {
        role: UserRole.RETAILER,
        status: UserStatus.ACTIVE
      },
      include: {
        licenses: {
          where: {
            type: { in: [LicenseType.RETAIL, LicenseType.BAR, LicenseType.RESTAURANT, LicenseType.HOTEL, LicenseType.CLUB] },
            status: LicenseStatus.ACTIVE,
            effectiveFrom: { lte: new Date() },
            effectiveTo: { gte: new Date() }
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

const getAvailableManufacturersForRetailer = async (req, res, next) => {
  try {
    const manufacturers = await prisma.user.findMany({
      where: {
        role: UserRole.MANUFACTURER,
        status: UserStatus.ACTIVE
      },
      include: {
        licenses: {
          where: {
            type: LicenseType.MANUFACTURING,
            status: LicenseStatus.ACTIVE,
            effectiveFrom: { lte: new Date() },
            effectiveTo: { gte: new Date() }
          },
          take: 1,
          orderBy: { effectiveTo: 'desc' }
        }
      }
    });

    
    const availableManufacturers = manufacturers.filter(m => m.licenses.length > 0)
      .map(m => ({
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        companyName: m.companyName,
        mobile: m.mobile,
        address: m.address,
        license: m.licenses[0]
      }));

    return ApiResponse.success(res, availableManufacturers, 'Available manufacturers fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getActiveManufacturers = async (req, res, next) => {
  try {
    const now = new Date();

    const manufacturers = await prisma.user.findMany({
      where: {
        role: UserRole.MANUFACTURER,
        licenses: {
          some: {
            type: LicenseType.MANUFACTURING,
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
            type: LicenseType.MANUFACTURING,
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
          orderBy: { effectiveFrom: 'desc' }
        }
      },
      orderBy: { companyName: 'asc' }
    });

    return ApiResponse.success(res, manufacturers, 'Active manufacturers fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createManufacturer,
  createManufacturerApplication,
  getManufacturers,
  getManufacturerById,
  updateManufacturer,
  updateManufacturerStatus,
  resetManufacturerPassword,
  getManufacturerLicenseApplication,
  updateManufacturerApplication,
  issueManufacturerLicense,
  getActiveManufacturers,
  getAvailableDistributors,
  getAvailableRetailers,
  getAvailableManufacturersForRetailer
};