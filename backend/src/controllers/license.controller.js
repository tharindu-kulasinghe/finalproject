const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { LicenseStatus } = require('@prisma/client');

const createLicense = async (req, res, next) => {
  try {
    const { type, companyName, businessAddress, taxIdentificationNo, holderId, effectiveTo } = req.body;

    if (!type || !companyName || !businessAddress || !holderId) {
      throw ApiError.badRequest('Type, company name, business address and holder are required');
    }

    const licenseCount = await prisma.license.count();
    const licenseNumber = `LIC-${Date.now()}-${licenseCount + 1}`;

    const license = await prisma.license.create({
      data: {
        licenseNumber,
        type,
        status: LicenseStatus.ACTIVE,
        companyName,
        businessAddress,
        taxIdentificationNo,
        holderId,
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null
      },
      include: {
        holder: {
          select: { id: true, fullName: true, email: true, companyName: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'License',
      entityId: license.id,
      description: `Created license: ${licenseNumber}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, license, 'License created successfully');
  } catch (error) {
    next(error);
  }
};

const getLicenses = async (req, res, next) => {
  try {
    const { status, type, holderId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (holderId) where.holderId = holderId;

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
        where,
        include: {
          holder: {
            select: { id: true, fullName: true, email: true, companyName: true }
          },
          manufacturingApplication: {
            select: { id: true, applicationNo: true }
          },
          distributionApplication: {
            select: { id: true, applicationNo: true }
          },
          retailApplication: {
            select: { id: true, applicationNo: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.license.count({ where })
    ]);

    return ApiResponse.success(res, {
      licenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getLicenseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        holder: {
          select: { id: true, fullName: true, email: true, companyName: true, mobile: true }
        },
        manufacturingApplication: {
          select: { id: true, applicationNo: true, companyName: true }
        },
        distributionApplication: {
          select: { id: true, applicationNo: true, businessName: true }
        },
        retailApplication: {
          select: { id: true, applicationNo: true, businessName: true }
        },
        product: {
          select: { id: true, name: true, code: true, category: true }
        },
        batches: {
          select: { id: true, batchNo: true, status: true, productionDate: true },
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        dutyAssessments: {
          select: { id: true, assessmentNo: true, status: true, assessedAmount: true },
          take: 10
        },
        payments: {
          select: { id: true, paymentRef: true, status: true, declaredAmount: true },
          take: 10
        },
        stampRequests: {
          select: { id: true, requestNo: true, status: true, quantityRequested: true },
          take: 10
        }
      }
    });

    if (!license) {
      throw ApiError.notFound('License not found');
    }

    
    const normalizedLicense = {
      ...license,
      products: license.product ? [license.product] : []
    };
    delete normalizedLicense.product;

    return ApiResponse.success(res, normalizedLicense);
  } catch (error) {
    next(error);
  }
};

const updateLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, businessAddress, taxIdentificationNo, effectiveTo } = req.body;

    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) {
      throw ApiError.notFound('License not found');
    }

    const updatedLicense = await prisma.license.update({
      where: { id },
      data: {
        ...(companyName && { companyName }),
        ...(businessAddress && { businessAddress }),
        ...(taxIdentificationNo && { taxIdentificationNo }),
        ...(effectiveTo && { effectiveTo: new Date(effectiveTo) })
      },
      include: {
        holder: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'License',
      entityId: id,
      description: `Updated license: ${license.licenseNumber}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedLicense, 'License updated');
  } catch (error) {
    next(error);
  }
};

const updateLicenseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const normalizedStatus = status === 'BANNED' ? LicenseStatus.REVOKED : status;

    const validStatuses = [
      LicenseStatus.ACTIVE,
      LicenseStatus.SUSPENDED,
      LicenseStatus.REVOKED,
      LicenseStatus.CANCELLED,
      LicenseStatus.EXPIRED,
    ];
    if (!validStatuses.includes(normalizedStatus)) {
      throw ApiError.badRequest('Invalid status');
    }

    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) {
      throw ApiError.notFound('License not found');
    }

    const updateData = { status: normalizedStatus, remarks };

    if (normalizedStatus === LicenseStatus.SUSPENDED) {
      updateData.suspendedAt = new Date();
    } else if (normalizedStatus === LicenseStatus.REVOKED) {
      updateData.revokedAt = new Date();
    } else if (normalizedStatus === LicenseStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    const { updatedLicense, productSyncCount } = await prisma.$transaction(async (tx) => {
      const licenseUpdate = await tx.license.update({
        where: { id },
        data: updateData,
        include: {
          holder: {
            select: { id: true, fullName: true, email: true }
          }
        }
      });

      const productUpdate = await tx.product.updateMany({
        where: { licenseId: id },
        data: { isActive: normalizedStatus === LicenseStatus.ACTIVE }
      });

      return { updatedLicense: licenseUpdate, productSyncCount: productUpdate.count };
    });

    await logAudit({
      userId: req.user.id,
      action:
        normalizedStatus === LicenseStatus.SUSPENDED
          ? 'SUSPEND'
          : normalizedStatus === LicenseStatus.REVOKED
            ? 'REVOKE'
            : 'UPDATE',
      entityType: 'License',
      entityId: id,
      description: `Updated license status to: ${normalizedStatus} and synced ${productSyncCount} linked product(s)`,
      oldValues: { status: license.status },
      newValues: { status: normalizedStatus },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedLicense, `License ${normalizedStatus.toLowerCase()} and linked products synchronized`);
  } catch (error) {
    next(error);
  }
};

const getMyLicenses = async (req, res, next) => {
  try {
    const licenses = await prisma.license.findMany({
      where: { holderId: req.user.id },
      include: {
        holder: {
          select: { id: true, fullName: true, email: true, companyName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, { licenses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLicense,
  getLicenses,
  getLicenseById,
  updateLicense,
  updateLicenseStatus,
  getMyLicenses
};
