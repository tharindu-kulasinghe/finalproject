const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { generateQRValue, generateCodeValue, generateCryptoHash, generateSerialNo } = require('../utils/qrGenerator');
const { logAudit } = require('../utils/auditLogger');
const { StampRequestStatus, TaxStampStatus } = require('@prisma/client');

const generateTaxStamps = async (req, res, next) => {
  try {
    const { stampRequestId } = req.params;

    const stampRequest = await prisma.stampRequest.findUnique({
      where: { id: stampRequestId },
      include: {
        product: true,
        batch: true,
        taxStamps: true
      }
    });

    if (!stampRequest) {
      throw ApiError.notFound('Stamp request not found');
    }

    if (stampRequest.status !== StampRequestStatus.ISSUED) {
      throw ApiError.badRequest('Stamp request must be issued before generating stamps');
    }

    const existingStampCount = stampRequest.taxStamps.length;
    const quantityToGenerate = (stampRequest.quantityIssued || stampRequest.quantityApproved) - existingStampCount;

    if (quantityToGenerate <= 0) {
      throw ApiError.conflict('All stamps already generated for this request');
    }

    const stamps = [];

    for (let i = 0; i < quantityToGenerate; i++) {
      const codeValue = generateCodeValue();
      const serialNo = generateSerialNo();
      const qrValue = generateQRValue({
        codeValue,
        serialNo,
        stampRequestId,
        productId: stampRequest.productId,
        batchId: stampRequest.batchId || null
      });
      const cryptoHash = generateCryptoHash(qrValue + codeValue + serialNo + Date.now() + i);

      const taxStamp = await prisma.taxStamp.create({
        data: {
          codeValue,
          qrValue,
          cryptoHash,
          serialNo,
          status: TaxStampStatus.GENERATED,
          productId: stampRequest.productId,
          batchId: stampRequest.batchId || null,
          stampRequestId,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });

      stamps.push(taxStamp);
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'TaxStamp',
      entityId: stampRequestId,
      description: `Generated ${quantityToGenerate} tax stamps for request: ${stampRequest.requestNo}`,
      newValues: { count: quantityToGenerate },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, stamps, `${quantityToGenerate} tax stamps generated`);
  } catch (error) {
    next(error);
  }
};

const getTaxStamps = async (req, res, next) => {
  try {
    const { status, productId, batchId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (batchId) where.batchId = batchId;

    const [stamps, total] = await Promise.all([
      prisma.taxStamp.findMany({
        where,
        include: {
          product: {
            select: { id: true, code: true, name: true, category: true }
          },
          batch: {
            select: { id: true, batchNo: true, productionDate: true }
          },
          stampRequest: {
            select: {
              id: true,
              requestNo: true,
              status: true,
              licenseId: true,
              requestedById: true,
              productId: true
            }
          }
        },
        orderBy: { generatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.taxStamp.count({ where })
    ]);

    return ApiResponse.success(res, {
      stamps,
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

const getTaxStampById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const taxStamp = await prisma.taxStamp.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, code: true, name: true, category: true, packType: true, packSizeMl: true }
        },
        batch: {
          select: { id: true, batchNo: true, productionDate: true, outputLiters: true, unitsProduced: true }
        },
        stampRequest: {
          select: {
            id: true,
            requestNo: true,
            quantityRequested: true,
            quantityApproved: true,
            quantityIssued: true,
            licenseId: true,
            requestedById: true,
            productId: true,
            status: true
          }
        },
        verificationLogs: {
          select: { id: true, channel: true, result: true, scannedLocation: true, verifiedAt: true },
          take: 10,
          orderBy: { verifiedAt: 'desc' }
        }
      }
    });

    if (!taxStamp) {
      throw ApiError.notFound('Tax stamp not found');
    }

    return ApiResponse.success(res, taxStamp);
  } catch (error) {
    next(error);
  }
};

const getTaxStampByCode = async (req, res, next) => {
  try {
    const { codeValue } = req.params;

    const taxStamp = await prisma.taxStamp.findFirst({
      where: {
        OR: [
          { codeValue },
          { qrValue: codeValue }
        ]
      },
      include: {
        product: {
          select: { id: true, code: true, name: true, category: true }
        },
        batch: {
          select: { id: true, batchNo: true, productionDate: true }
        },
        stampRequest: {
          select: { id: true, requestNo: true, licenseId: true, requestedById: true, productId: true, status: true }
        }
      }
    });

    if (!taxStamp) {
      throw ApiError.notFound('Tax stamp not found');
    }

    return ApiResponse.success(res, taxStamp);
  } catch (error) {
    next(error);
  }
};

const updateTaxStampStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, suspiciousFlag, suspiciousReason } = req.body;

    const validStatuses = [TaxStampStatus.ACTIVE, TaxStampStatus.VOID, TaxStampStatus.FLAGGED];
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }

    const taxStamp = await prisma.taxStamp.findUnique({ where: { id } });

    if (!taxStamp) {
      throw ApiError.notFound('Tax stamp not found');
    }

    const updateData = { status };
    if (suspiciousFlag !== undefined) {
      updateData.suspiciousFlag = suspiciousFlag;
      if (suspiciousReason) updateData.suspiciousReason = suspiciousReason;
    }

    const updatedStamp = await prisma.taxStamp.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, code: true, name: true } }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'TaxStamp',
      entityId: id,
      description: `Updated tax stamp status to: ${status}`,
      oldValues: { status: taxStamp.status },
      newValues: { status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedStamp, `Tax stamp ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateTaxStamps,
  getTaxStamps,
  getTaxStampById,
  getTaxStampByCode,
  updateTaxStampStatus
};
