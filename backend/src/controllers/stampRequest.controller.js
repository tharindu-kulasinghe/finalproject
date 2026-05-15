const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { generateQRValue, generateCodeValue, generateCryptoHash, generateSerialNo } = require('../utils/qrGenerator');
const JSZip = require('jszip');
const QRCode = require('qrcode');
const { UserRole, BatchStatus, StampRequestStatus, TaxStampStatus } = require('@prisma/client');

const sanitizeFileSegment = (value) => {
  if (!value) return 'unknown';
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '_');
};

const createStampRequest = async (req, res, next) => {
  try {
    const { productId, licenseId, batchId, quantityRequested, reason } = req.body;

    if (![UserRole.MANUFACTURER, UserRole.LICENSE_HOLDER].includes(req.user.role)) {
      throw ApiError.forbidden('Only manufacturers can create stamp requests');
    }

    if (!productId || !licenseId || !batchId || !quantityRequested) {
      throw ApiError.badRequest('Product, license, batch and quantity are required');
    }

    const parsedQuantity = Number(quantityRequested);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      throw ApiError.badRequest('Quantity requested must be a positive integer');
    }

    const license = await prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) {
      throw ApiError.notFound('License not found');
    }

    if (license.holderId !== req.user.id) {
      throw ApiError.forbidden('You can only request stamps for your own licenses');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { license: true }
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (product.license.holderId !== req.user.id) {
      throw ApiError.forbidden('You can only request stamps for your own products');
    }

    if (product.licenseId !== licenseId) {
      throw ApiError.badRequest('Selected product does not belong to selected license');
    }

    const batch = await prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw ApiError.notFound('Batch not found');
    }
    if (batch.productId !== productId || batch.licenseId !== licenseId) {
      throw ApiError.badRequest('Batch does not belong to selected product and license');
    }
    if (batch.status !== BatchStatus.VERIFIED) {
      throw ApiError.badRequest('You can request stamps only for a VERIFIED batch');
    }

    const requestCount = await prisma.stampRequest.count();
    const requestNo = `SR-${Date.now()}-${requestCount + 1}`;

    const stampRequest = await prisma.stampRequest.create({
      data: {
        requestNo,
        quantityRequested: parsedQuantity,
        reason,
        requestedAt: new Date(),
        requestedById: req.user.id,
        licenseId,
        productId,
        batchId,
        status: StampRequestStatus.PENDING
      },
      include: {
        requestedBy: {
          select: { id: true, fullName: true, email: true, companyName: true, role: true }
        },
        product: {
          select: { id: true, code: true, name: true, category: true }
        },
        license: {
          select: { id: true, licenseNumber: true, companyName: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'StampRequest',
      entityId: stampRequest.id,
      description: `Created stamp request: ${requestNo}`,
      newValues: { quantityRequested },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, stampRequest, 'Stamp request created');
  } catch (error) {
    next(error);
  }
};

const getStampRequests = async (req, res, next) => {
  try {
    const { status, licenseId, productId, requestedById, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;
    if (licenseId) where.licenseId = licenseId;
    if (productId) where.productId = productId;
    if (requestedById) where.requestedById = requestedById;

    if ([UserRole.MANUFACTURER, UserRole.LICENSE_HOLDER].includes(req.user.role)) {
      where.requestedById = req.user.id;
    } else if (![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view stamp requests');
    }

    const [requests, total] = await Promise.all([
      prisma.stampRequest.findMany({
        where,
        include: {
          requestedBy: {
            select: { id: true, fullName: true, email: true, companyName: true, role: true }
          },
          reviewedBy: {
            select: { id: true, fullName: true, role: true }
          },
          product: {
            select: { id: true, code: true, name: true, category: true }
          },
          license: {
            select: { id: true, licenseNumber: true, companyName: true }
          },
          batch: {
            select: { id: true, batchNo: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.stampRequest.count({ where })
    ]);

    return ApiResponse.success(res, {
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getStampRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.stampRequest.findUnique({
      where: { id },
      include: {
        requestedBy: {
          select: { id: true, fullName: true, email: true, companyName: true, role: true }
        },
        reviewedBy: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        product: {
          select: { id: true, code: true, name: true, category: true, packType: true, packSizeMl: true }
        },
        license: {
          select: { id: true, licenseNumber: true, companyName: true, type: true }
        },
        batch: {
          select: { id: true, batchNo: true, productionDate: true, outputLiters: true }
        },
        taxStamps: {
          select: { id: true, codeValue: true, serialNo: true, status: true, assignedAt: true },
          take: 20
        }
      }
    });

    if (!request) {
      throw ApiError.notFound('Stamp request not found');
    }

    if ([UserRole.MANUFACTURER, UserRole.LICENSE_HOLDER].includes(req.user.role) && request.requestedById !== req.user.id) {
      throw ApiError.forbidden('You can only view your own stamp requests');
    }

    if (![UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER, UserRole.LICENSE_HOLDER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view this stamp request');
    }

    return ApiResponse.success(res, request);
  } catch (error) {
    next(error);
  }
};

const reviewStampRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantityApproved, status, reason } = req.body;

    const validStatuses = [StampRequestStatus.APPROVED, StampRequestStatus.REJECTED, StampRequestStatus.RETURNED];
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status. Only APPROVED, REJECTED, RETURNED allowed');
    }

    const stampRequest = await prisma.stampRequest.findUnique({ where: { id } });

    if (!stampRequest) {
      throw ApiError.notFound('Stamp request not found');
    }

    if (stampRequest.status !== StampRequestStatus.PENDING) {
      throw ApiError.badRequest('Only pending requests can be reviewed');
    }

    const updateData = {
      status,
      reviewedById: req.user.id,
      reviewedAt: new Date()
    };

    if (status === StampRequestStatus.APPROVED) {
      const approvedQty = quantityApproved !== undefined ? Number(quantityApproved) : stampRequest.quantityRequested;
      if (!Number.isInteger(approvedQty) || approvedQty <= 0) {
        throw ApiError.badRequest('Approved quantity must be a positive integer');
      }
      if (approvedQty > stampRequest.quantityRequested) {
        throw ApiError.badRequest('Approved quantity cannot exceed requested quantity');
      }
      updateData.quantityApproved = approvedQty;
    } else if (status === StampRequestStatus.RETURNED) {
      if (!reason) {
        throw ApiError.badRequest('Return reason is required');
      }
      updateData.reason = (stampRequest.reason || '') + '\nReturn reason: ' + reason;
    } else if (status === StampRequestStatus.REJECTED) {
      if (!reason) {
        throw ApiError.badRequest('Rejection reason is required');
      }
      updateData.reason = (stampRequest.reason || '') + '\nRejection reason: ' + reason;
    }

    const updatedRequest = await prisma.stampRequest.update({
      where: { id },
      data: updateData,
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        product: { select: { id: true, code: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true, role: true } }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: status === StampRequestStatus.APPROVED ? 'APPROVE' : status === StampRequestStatus.REJECTED ? 'REJECT' : 'UPDATE',
      entityType: 'StampRequest',
      entityId: id,
      description: `Reviewed stamp request: ${stampRequest.requestNo} - ${status}`,
      oldValues: { status: stampRequest.status },
      newValues: { status, quantityApproved },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedRequest, `Stamp request ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
};

const issueStamps = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantityIssued } = req.body;

    const stampRequest = await prisma.stampRequest.findUnique({
      where: { id },
      include: {
        product: true,
        batch: true
      }
    });

    if (!stampRequest) {
      throw ApiError.notFound('Stamp request not found');
    }

    if (stampRequest.status !== StampRequestStatus.APPROVED) {
      throw ApiError.badRequest('Stamp request must be approved before issuing');
    }

    const quantity = Number(quantityIssued ?? stampRequest.quantityApproved);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw ApiError.badRequest('Valid quantity to issue is required');
    }

    if (quantity > (stampRequest.quantityApproved || 0)) {
      throw ApiError.badRequest('Cannot issue more than approved quantity');
    }

    const { updatedRequest, generatedCount, linkedCount } = await prisma.$transaction(async (tx) => {
      const requestAfterIssue = await tx.stampRequest.update({
        where: { id },
        data: {
          status: StampRequestStatus.ISSUED,
          quantityIssued: quantity,
          issuedAt: new Date()
        },
        include: {
          requestedBy: { select: { id: true, fullName: true, email: true } },
          product: { select: { id: true, code: true, name: true } },
          license: { select: { id: true, licenseNumber: true } },
          batch: { select: { id: true, batchNo: true } }
        }
      });

      const existingCount = await tx.taxStamp.count({
        where: { stampRequestId: id }
      });

      const remainingToGenerate = Math.max(quantity - existingCount, 0);
      if (remainingToGenerate > 0) {
        for (let i = 0; i < remainingToGenerate; i++) {
          const codeValue = generateCodeValue();
          const serialNo = generateSerialNo();
          const qrValue = generateQRValue({
            codeValue,
            serialNo,
            stampRequestId: id,
            productId: stampRequest.productId,
            batchId: stampRequest.batchId || null
          });
          const cryptoHash = generateCryptoHash(qrValue + codeValue + serialNo + Date.now() + i);
          const generatedAt = new Date();

          await tx.taxStamp.create({
            data: {
              codeValue,
              qrValue,
              cryptoHash,
              serialNo,
              status: stampRequest.batchId ? TaxStampStatus.ASSIGNED : TaxStampStatus.GENERATED,
              productId: stampRequest.productId,
              batchId: stampRequest.batchId || null,
              stampRequestId: id,
              generatedAt,
              assignedAt: stampRequest.batchId ? generatedAt : null,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          });
        }
      }

      let linked = { count: 0 };
      if (stampRequest.batchId) {
        linked = await tx.taxStamp.updateMany({
          where: {
            stampRequestId: id,
            OR: [{ batchId: null }, { batchId: { not: stampRequest.batchId } }],
            status: { in: [TaxStampStatus.GENERATED, TaxStampStatus.ACTIVE, TaxStampStatus.ASSIGNED] }
          },
          data: {
            batchId: stampRequest.batchId,
            status: TaxStampStatus.ASSIGNED,
            assignedAt: new Date()
          }
        });
      }

      return {
        updatedRequest: requestAfterIssue,
        generatedCount: remainingToGenerate,
        linkedCount: linked.count
      };
    });

    await logAudit({
      userId: req.user.id,
      action: 'ISSUE',
      entityType: 'StampRequest',
      entityId: id,
      description: `Issued ${quantity} stamps for request: ${stampRequest.requestNo}${stampRequest.batchId ? ' and assigned to batch' : ''}`,
      newValues: { quantityIssued: quantity, generatedCount, linkedCount },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(
      res,
      {
        ...updatedRequest,
        generatedStampCount: generatedCount,
        linkedStampCount: linkedCount
      },
      `${quantity} stamps issued successfully${stampRequest.batchId ? ' and assigned to batch' : ''}`
    );
  } catch (error) {
    next(error);
  }
};

const downloadStampBundleZip = async (req, res, next) => {
  try {
    const requestId = req.params.id || req.query.requestId;
    const where = {
      status: StampRequestStatus.ISSUED
    };

    if (requestId) {
      where.id = requestId;
    }

    if ([UserRole.MANUFACTURER, UserRole.LICENSE_HOLDER].includes(req.user.role)) {
      where.requestedById = req.user.id;
    } else if (![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to download stamp bundles');
    } else if (req.query.requestedById) {
      where.requestedById = req.query.requestedById;
    }

    const issuedRequests = await prisma.stampRequest.findMany({
      where,
      include: {
        requestedBy: {
          select: { id: true, fullName: true, companyName: true }
        },
        product: {
          select: { id: true, name: true, code: true, category: true }
        },
        license: {
          select: { id: true, licenseNumber: true }
        },
        batch: {
          select: { id: true, batchNo: true }
        },
        taxStamps: {
          select: {
            id: true,
            codeValue: true,
            qrValue: true,
            cryptoHash: true,
            serialNo: true,
            status: true,
            generatedAt: true,
            assignedAt: true,
            expiresAt: true
          },
          orderBy: { generatedAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (requestId && !issuedRequests.length) {
      throw ApiError.notFound('Issued stamp request not found for download');
    }

    const stamps = issuedRequests.flatMap((request) =>
      (request.taxStamps || []).map((stamp) => ({ request, stamp }))
    );

    if (!stamps.length) {
      throw ApiError.notFound('No generated stamps available to download');
    }

    const zip = new JSZip();

    for (const { request, stamp } of stamps) {
      const requestFolder = sanitizeFileSegment(request.requestNo || request.id);
      const stampFileBase = sanitizeFileSegment(stamp.serialNo || stamp.codeValue || stamp.id);
      const qrPng = await QRCode.toBuffer(stamp.qrValue, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 360
      });

      zip.file(`qr/${requestFolder}/${stampFileBase}.png`, qrPng);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const fileName = issuedRequests.length === 1
      ? `iecms-stamps-${sanitizeFileSegment(issuedRequests[0].requestNo || issuedRequests[0].id)}.zip`
      : `iecms-stamps-${new Date().toISOString().slice(0, 10)}.zip`;

    await logAudit({
      userId: req.user.id,
      action: 'EXPORT',
      entityType: 'TaxStamp',
      entityId: requestId || undefined,
      description: requestId
        ? `Downloaded ZIP bundle for stamp request ${requestId} with ${stamps.length} stamp(s)`
        : `Downloaded stamp ZIP bundle with ${stamps.length} stamp(s)`,
      newValues: { stampCount: stamps.length, requestCount: issuedRequests.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.status(200).send(zipBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStampRequest,
  getStampRequests,
  getStampRequestById,
  reviewStampRequest,
  issueStamps,
  downloadStampBundleZip
};
