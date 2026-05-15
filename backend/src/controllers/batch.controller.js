const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const {
  UserRole,
  BatchStatus,
  DutyAssessmentStatus,
  StampRequestStatus,
  TaxStampStatus,
} = require('@prisma/client');
const { generateQRValue, generateCodeValue, generateCryptoHash, generateSerialNo } = require('../utils/qrGenerator');

const resolveDutyRateForBatch = async (tx, batch) => {
  const now = new Date();

  let dutyRate = await tx.dutyRate.findFirst({
    where: {
      productId: batch.productId,
      isActive: true,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
    },
    orderBy: { effectiveFrom: 'desc' }
  });

  if (!dutyRate) {
    dutyRate = await tx.dutyRate.findFirst({
      where: {
        category: batch.product.category,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
  }

  if (!dutyRate) {
    throw ApiError.notFound('No active duty rate found for this product/category');
  }

  return dutyRate;
};

const createDutyAssessmentForBatch = async (tx, batch, userId) => {
  const existingAssessment = await tx.dutyAssessment.findFirst({
    where: {
      batchId: batch.id,
      status: {
        in: [
          DutyAssessmentStatus.CALCULATED,
          DutyAssessmentStatus.PART_PAID,
          DutyAssessmentStatus.OVERDUE,
        ],
      }
    }
  });

  if (existingAssessment) {
    return existingAssessment;
  }

  const dutyRate = await resolveDutyRateForBatch(tx, batch);

  const liters = Number(batch.outputLiters || 0);
  const units = Number(batch.unitsProduced || 0);
  const ratePerLiter = dutyRate.ratePerLiter != null ? Number(dutyRate.ratePerLiter) : null;
  const ratePerUnit = dutyRate.ratePerUnit != null ? Number(dutyRate.ratePerUnit) : null;

  if (ratePerLiter == null && ratePerUnit == null) {
    throw ApiError.badRequest('Selected duty rate has no ratePerLiter or ratePerUnit configured');
  }

  const assessedAmountRaw =
    (ratePerLiter != null ? liters * ratePerLiter : 0) +
    (ratePerUnit != null ? units * ratePerUnit : 0);

  if (!Number.isFinite(assessedAmountRaw) || assessedAmountRaw < 0) {
    throw ApiError.badRequest('Calculated duty amount is invalid');
  }

  const assessedAmount = Number(assessedAmountRaw.toFixed(2));
  const assessmentCount = await tx.dutyAssessment.count();
  const assessmentNo = `DA-${Date.now()}-${assessmentCount + 1}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  return tx.dutyAssessment.create({
    data: {
      assessmentNo,
      assessedAmount,
      paidAmount: 0,
      balanceAmount: assessedAmount,
      dueDate,
      status: DutyAssessmentStatus.CALCULATED,
      batchId: batch.id,
      licenseId: batch.licenseId,
      dutyRateId: dutyRate.id,
      calculatedById: userId
    }
  });
};

const createBatch = async (req, res, next) => {
  try {
    const { productId, licenseId, productionDate, rawSpiritInputLiters, outputLiters, unitsProduced, wastageLiters, notes } = req.body;

    if (!productId || !licenseId || !productionDate) {
      throw ApiError.badRequest('Product, license and production date are required');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { license: true }
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (![UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to create production batches');
    }

    if (product.licenseId !== licenseId) {
      throw ApiError.badRequest('Selected license does not match selected product');
    }

    if (product.license.holderId !== req.user.id && ![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You can only create batches for your own products');
    }

    const batchCount = await prisma.productionBatch.count();
    const batchNo = `BATCH-${Date.now()}-${batchCount + 1}`;

    const batch = await prisma.productionBatch.create({
      data: {
        batchNo,
        productionDate: new Date(productionDate),
        rawSpiritInputLiters,
        outputLiters,
        unitsProduced,
        wastageLiters,
        notes,
        productId,
        licenseId,
        status: BatchStatus.DRAFT
      },
      include: {
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
      entityType: 'ProductionBatch',
      entityId: batch.id,
      description: `Created batch: ${batchNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, batch, 'Production batch created');
  } catch (error) {
    next(error);
  }
};

const getBatches = async (req, res, next) => {
  try {
    const { status, licenseId, productId, category, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;
    if (licenseId) where.licenseId = licenseId;
    if (productId) where.productId = productId;
    if (category) where.product = { category };

    if (req.user.role === UserRole.MANUFACTURER) {
      where.license = { holderId: req.user.id };
    } else if (![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view production batches');
    }

    const [batches, total] = await Promise.all([
      prisma.productionBatch.findMany({
        where,
        include: {
          product: {
            select: { id: true, code: true, name: true, category: true }
          },
          license: {
            select: { id: true, licenseNumber: true, companyName: true }
          },
          submittedBy: {
            select: { id: true, fullName: true }
          },
          verifiedBy: {
            select: { id: true, fullName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.productionBatch.count({ where })
    ]);

    return ApiResponse.success(res, {
      batches,
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

const getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, code: true, name: true, category: true, packType: true, packSizeMl: true, alcoholStrength: true }
        },
        license: {
          select: { id: true, licenseNumber: true, type: true, companyName: true, holderId: true }
        },
        submittedBy: {
          select: { id: true, fullName: true, email: true }
        },
        verifiedBy: {
          select: { id: true, fullName: true, email: true }
        },
        dutyAssessments: {
          select: { id: true, assessmentNo: true, status: true, assessedAmount: true, paidAmount: true }
        },
        taxStamps: {
          select: { id: true, codeValue: true, serialNo: true, status: true, assignedAt: true },
          take: 10
        },
        stampRequests: {
          select: {
            id: true,
            requestNo: true,
            status: true,
            quantityIssued: true,
            taxStamps: {
              select: { id: true, codeValue: true, serialNo: true, status: true, assignedAt: true },
              take: 50
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!batch) {
      throw ApiError.notFound('Production batch not found');
    }

    if (
      req.user.role === UserRole.MANUFACTURER &&
      batch.license?.holderId !== req.user.id
    ) {
      throw ApiError.forbidden('You can only view your own batches');
    }

    if (![UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view this production batch');
    }

    
    
    const orphanRequestStamps = await prisma.taxStamp.findMany({
      where: {
        batchId: null,
        stampRequest: { batchId: id }
      },
      select: { id: true }
    });

    if (orphanRequestStamps.length > 0) {
      const orphanIds = orphanRequestStamps.map((s) => s.id);
      await prisma.taxStamp.updateMany({
        where: {
          id: { in: orphanIds },
          status: { in: [TaxStampStatus.GENERATED, TaxStampStatus.ACTIVE] }
        },
        data: {
          batchId: id,
          status: TaxStampStatus.ASSIGNED,
          assignedAt: new Date()
        }
      });

      await prisma.taxStamp.updateMany({
        where: {
          id: { in: orphanIds },
          status: { notIn: [TaxStampStatus.GENERATED, TaxStampStatus.ACTIVE] }
        },
        data: {
          batchId: id,
          assignedAt: new Date()
        }
      });
    }

    
    
    const issuedRequests = await prisma.stampRequest.findMany({
      where: {
        batchId: id,
        status: StampRequestStatus.ISSUED,
        quantityIssued: { gt: 0 }
      },
      select: {
        id: true,
        productId: true,
        quantityIssued: true
      }
    });

    if (issuedRequests.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const request of issuedRequests) {
          const existingCount = await tx.taxStamp.count({
            where: { stampRequestId: request.id }
          });

          const required = Number(request.quantityIssued || 0);
          const missing = Math.max(required - existingCount, 0);

          for (let i = 0; i < missing; i++) {
            const codeValue = generateCodeValue();
            const serialNo = generateSerialNo();
            const qrValue = generateQRValue({
              codeValue,
              serialNo,
              stampRequestId: request.id,
              productId: request.productId,
              batchId: id
            });
            const cryptoHash = generateCryptoHash(qrValue + codeValue + serialNo + Date.now() + i);
            const assignedAt = new Date();

            await tx.taxStamp.create({
              data: {
                codeValue,
                qrValue,
                cryptoHash,
                serialNo,
                status: TaxStampStatus.ASSIGNED,
                generatedAt: assignedAt,
                assignedAt,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                productId: request.productId,
                batchId: id,
                stampRequestId: request.id
              }
            });
          }
        }
      });
    }

    batch.taxStamps = await prisma.taxStamp.findMany({
      where: { batchId: id },
      select: { id: true, codeValue: true, serialNo: true, status: true, assignedAt: true },
      take: 10,
      orderBy: { generatedAt: 'desc' }
    });

    batch.stampRequests = await prisma.stampRequest.findMany({
      where: { batchId: id },
      select: {
        id: true,
        requestNo: true,
        status: true,
        quantityIssued: true,
        taxStamps: {
          select: { id: true, codeValue: true, serialNo: true, status: true, assignedAt: true },
          take: 50
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return ApiResponse.success(res, batch);
  } catch (error) {
    next(error);
  }
};

const updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productionDate, rawSpiritInputLiters, outputLiters, unitsProduced, wastageLiters, notes } = req.body;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: { license: true }
    });

    if (!batch) {
      throw ApiError.notFound('Production batch not found');
    }

    if (batch.license.holderId !== req.user.id && ![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You can only update your own batches');
    }

    if (batch.status !== BatchStatus.DRAFT && batch.status !== BatchStatus.FLAGGED) {
      throw ApiError.badRequest('Can only update draft or flagged batches');
    }

    const oldValues = {
      outputLiters: batch.outputLiters,
      unitsProduced: batch.unitsProduced,
      wastageLiters: batch.wastageLiters
    };

    const updatedBatch = await prisma.productionBatch.update({
      where: { id },
      data: {
        ...(productionDate && { productionDate: new Date(productionDate) }),
        ...(rawSpiritInputLiters !== undefined && { rawSpiritInputLiters }),
        ...(outputLiters !== undefined && { outputLiters }),
        ...(unitsProduced !== undefined && { unitsProduced }),
        ...(wastageLiters !== undefined && { wastageLiters }),
        ...(notes !== undefined && { notes })
      },
      include: {
        product: {
          select: { id: true, code: true, name: true }
        },
        license: {
          select: { id: true, licenseNumber: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'ProductionBatch',
      entityId: id,
      description: `Updated batch: ${batch.batchNo}`,
      oldValues,
      newValues: { outputLiters: updatedBatch.outputLiters, unitsProduced: updatedBatch.unitsProduced },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedBatch, 'Batch updated');
  } catch (error) {
    next(error);
  }
};

const submitBatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: { license: true }
    });

    if (!batch) {
      throw ApiError.notFound('Production batch not found');
    }

    if (batch.license.holderId !== req.user.id) {
      throw ApiError.forbidden('You can only submit your own batches');
    }

    if (batch.status !== BatchStatus.DRAFT && batch.status !== BatchStatus.FLAGGED) {
      throw ApiError.badRequest('Can only submit draft or flagged batches');
    }

    if (!batch.outputLiters || !batch.unitsProduced) {
      throw ApiError.badRequest('Output liters and units produced are required');
    }

    const updatedBatch = await prisma.productionBatch.update({
      where: { id },
      data: {
        status: BatchStatus.SUBMITTED,
        submittedAt: new Date(),
        submittedById: req.user.id
      },
      include: {
        product: { select: { id: true, code: true, name: true } },
        license: { select: { id: true, licenseNumber: true } }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'SUBMIT',
      entityType: 'ProductionBatch',
      entityId: id,
      description: `Submitted batch: ${batch.batchNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedBatch, 'Batch submitted for verification');
  } catch (error) {
    next(error);
  }
};

const verifyBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, category: true } },
        license: { select: { id: true, holderId: true } }
      }
    });

    if (!batch) {
      throw ApiError.notFound('Production batch not found');
    }

    if (batch.status !== BatchStatus.SUBMITTED) {
      throw ApiError.badRequest('Batch must be submitted before verification');
    }

    const { updatedBatch, dutyAssessment } = await prisma.$transaction(async (tx) => {
      const createdDutyAssessment = await createDutyAssessmentForBatch(tx, batch, req.user.id);

      const verifiedBatch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: BatchStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedById: req.user.id,
          ...(remarks && { notes: `${batch.notes ? `${batch.notes}\n` : ''}Verification remarks: ${remarks}` })
        },
        include: {
          product: { select: { id: true, code: true, name: true } },
          license: { select: { id: true, licenseNumber: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
          dutyAssessments: {
            select: { id: true, assessmentNo: true, status: true, assessedAmount: true, paidAmount: true }
          }
        }
      });

      return {
        updatedBatch: verifiedBatch,
        dutyAssessment: createdDutyAssessment
      };
    });

    await logAudit({
      userId: req.user.id,
      action: 'VERIFY',
      entityType: 'ProductionBatch',
      entityId: id,
      description: `Verified batch: ${batch.batchNo}; duty ${dutyAssessment.assessmentNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(
      res,
      {
        ...updatedBatch,
        dutyAssessment: {
          id: dutyAssessment.id,
          assessmentNo: dutyAssessment.assessmentNo,
          assessedAmount: dutyAssessment.assessedAmount,
          status: dutyAssessment.status
        }
      },
      'Batch verified and duty assessment created. Manufacturer can now request stamps for this batch.'
    );
  } catch (error) {
    next(error);
  }
};

const rejectBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks, reason } = req.body;
    const rejectionRemarks = remarks || reason;

    const batch = await prisma.productionBatch.findUnique({ where: { id } });

    if (!batch) {
      throw ApiError.notFound('Production batch not found');
    }

    if (batch.status !== BatchStatus.SUBMITTED) {
      throw ApiError.badRequest('Batch must be submitted before rejection');
    }

    const updatedBatch = await prisma.productionBatch.update({
      where: { id },
      data: {
        status: BatchStatus.FLAGGED,
        ...(rejectionRemarks && { notes: `${batch.notes ? `${batch.notes}\n` : ''}Rejection remarks: ${rejectionRemarks}` })
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'REJECT',
      entityType: 'ProductionBatch',
      entityId: id,
      description: `Rejected batch: ${batch.batchNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedBatch, 'Batch rejected');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  submitBatch,
  verifyBatch,
  rejectBatch
};
