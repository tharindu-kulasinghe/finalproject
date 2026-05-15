const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { UserRole, BatchStatus, DutyAssessmentStatus } = require('@prisma/client');

const calculateDutyForBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        product: {
          include: { license: true }
        },
        dutyAssessments: true
      }
    });

    if (!batch) {
      throw ApiError.notFound('Production batch not found');
    }

    if (batch.status !== BatchStatus.VERIFIED) {
      throw ApiError.badRequest('Batch must be verified before calculating duty');
    }

    const existingActiveAssessment = batch.dutyAssessments.find(
      (d) =>
        d.status !== DutyAssessmentStatus.CANCELLED &&
        (d.status === DutyAssessmentStatus.CALCULATED || d.status === DutyAssessmentStatus.PART_PAID)
    );

    if (existingActiveAssessment) {
      throw ApiError.conflict('An active duty assessment already exists for this batch');
    }

    const now = new Date();

    let selectedDutyRate = await prisma.dutyRate.findFirst({
      where: {
        productId: batch.productId,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    if (!selectedDutyRate) {
      selectedDutyRate = await prisma.dutyRate.findFirst({
        where: {
          category: batch.product.category,
          isActive: true,
          effectiveFrom: { lte: now },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: now } }
          ]
        },
        orderBy: { effectiveFrom: 'desc' }
      });

      if (!selectedDutyRate) {
        throw ApiError.notFound('No active duty rate found for this product category');
      }
    }

    const liters = Number(batch.outputLiters || 0);
    const units = Number(batch.unitsProduced || 0);
    const ratePerLiter = selectedDutyRate.ratePerLiter != null ? Number(selectedDutyRate.ratePerLiter) : null;
    const ratePerUnit = selectedDutyRate.ratePerUnit != null ? Number(selectedDutyRate.ratePerUnit) : null;

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

    const assessmentCount = await prisma.dutyAssessment.count();
    const assessmentNo = `DA-${Date.now()}-${assessmentCount + 1}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const dutyAssessment = await prisma.dutyAssessment.create({
      data: {
        assessmentNo,
        assessedAmount,
        paidAmount: 0,
        balanceAmount: assessedAmount,
        dueDate,
        status: DutyAssessmentStatus.CALCULATED,
        batchId,
        licenseId: batch.licenseId,
        dutyRateId: selectedDutyRate.id,
        calculatedById: req.user.id
      },
      include: {
        batch: {
          select: { id: true, batchNo: true, outputLiters: true, product: { select: { name: true, category: true } } }
        },
        license: {
          select: { id: true, licenseNumber: true, companyName: true }
        },
        dutyRate: true,
        calculatedBy: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'DutyAssessment',
      entityId: dutyAssessment.id,
      description: `Calculated duty: ${assessmentNo} for batch ${batch.batchNo}`,
      newValues: { assessedAmount, assessmentNo },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, dutyAssessment, 'Duty calculated successfully');
  } catch (error) {
    next(error);
  }
};

const getDutyAssessments = async (req, res, next) => {
  try {
    const { status, licenseId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (licenseId) where.licenseId = licenseId;

    if (req.user.role === UserRole.MANUFACTURER) {
      where.license = { holderId: req.user.id };
    } else if (![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view duty assessments');
    }

    const [assessments, total] = await Promise.all([
      prisma.dutyAssessment.findMany({
        where,
        include: {
          batch: {
            select: { id: true, batchNo: true, product: { select: { name: true, category: true } } }
          },
          license: {
            select: { id: true, licenseNumber: true, companyName: true }
          },
          calculatedBy: {
            select: { id: true, fullName: true }
          }
        },
        orderBy: { calculatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.dutyAssessment.count({ where })
    ]);

    return ApiResponse.success(res, {
      assessments,
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

const getDutyAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.dutyAssessment.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            product: { select: { id: true, code: true, name: true, category: true, packType: true, packSizeMl: true, alcoholStrength: true } },
            license: { select: { id: true, licenseNumber: true, companyName: true } }
          }
        },
        license: {
          select: { id: true, holderId: true, licenseNumber: true, companyName: true, type: true }
        },
        dutyRate: true,
        calculatedBy: {
          select: { id: true, fullName: true, email: true }
        },
        paymentAllocations: {
          include: {
            payment: {
              select: { id: true, paymentRef: true, status: true, verifiedAmount: true, verifiedAt: true }
            }
          }
        }
      }
    });

    if (!assessment) {
      throw ApiError.notFound('Duty assessment not found');
    }

    if (req.user.role === UserRole.MANUFACTURER && assessment.license?.holderId !== req.user.id) {
      throw ApiError.forbidden('You can only view duty assessments for your own licenses');
    }

    if (![UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view this duty assessment');
    }

    return ApiResponse.success(res, assessment);
  } catch (error) {
    next(error);
  }
};

const getOverdueDuties = async (req, res, next) => {
  try {
    const now = new Date();

    const overdueAssessments = await prisma.dutyAssessment.findMany({
      where: {
        status: {
          in: [
            DutyAssessmentStatus.CALCULATED,
            DutyAssessmentStatus.PART_PAID,
            DutyAssessmentStatus.OVERDUE,
          ],
        },
        dueDate: { lt: now }
      },
      include: {
        batch: {
          select: { id: true, batchNo: true, product: { select: { name: true } } }
        },
        license: {
          select: { id: true, licenseNumber: true, companyName: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    for (const assessment of overdueAssessments) {
      if (assessment.status !== DutyAssessmentStatus.OVERDUE) {
        await prisma.dutyAssessment.update({
          where: { id: assessment.id },
          data: { status: DutyAssessmentStatus.OVERDUE }
        });
      }
    }

    return ApiResponse.success(res, overdueAssessments);
  } catch (error) {
    next(error);
  }
};

const updateDutyAssessmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const assessment = await prisma.dutyAssessment.findUnique({ where: { id } });

    if (!assessment) {
      throw ApiError.notFound('Duty assessment not found');
    }

    const validStatuses = [DutyAssessmentStatus.WAIVED, DutyAssessmentStatus.CANCELLED];
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status. Only WAIVED or CANCELLED allowed');
    }

    const updatedAssessment = await prisma.dutyAssessment.update({
      where: { id },
      data: {
        status,
        ...(remarks && { remarks })
      },
      include: {
        batch: { select: { id: true, batchNo: true } },
        license: { select: { id: true, licenseNumber: true, companyName: true } }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'DutyAssessment',
      entityId: id,
      description: `Updated duty assessment status to: ${status}`,
      oldValues: { status: assessment.status },
      newValues: { status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedAssessment, `Duty assessment ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
};

const getTaxRates = async (req, res, next) => {
  try {
    const { category, isActive } = req.query;
    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const taxRates = await prisma.dutyRate.findMany({
      where,
      orderBy: { effectiveFrom: 'desc' }
    });

    return ApiResponse.success(res, { taxRates });
  } catch (error) {
    next(error);
  }
};

const getTaxRateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taxRate = await prisma.dutyRate.findUnique({ where: { id } });

    if (!taxRate) {
      throw ApiError.notFound('Tax rate not found');
    }

    return ApiResponse.success(res, taxRate);
  } catch (error) {
    next(error);
  }
};

const normalizeTaxRateCategory = (category) => {
  const normalizedCategory = category ? String(category).trim().toUpperCase() : null;
  return normalizedCategory;
};

const parseOptionalNumber = (value, fieldLabel) => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw ApiError.badRequest(`${fieldLabel} must be a valid number`);
  }

  return parsed;
};

const parseRequiredDate = (value, fieldLabel) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw ApiError.badRequest(`${fieldLabel} must be a valid date`);
  }
  return parsed;
};

const parseOptionalDate = (value, fieldLabel) => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw ApiError.badRequest(`${fieldLabel} must be a valid date`);
  }
  return parsed;
};

const createTaxRate = async (req, res, next) => {
  try {
    const { category, ratePerLiter, ratePerUnit, legalReference, effectiveFrom, effectiveTo } = req.body;

    const normalizedCategory = normalizeTaxRateCategory(category);
    if (!normalizedCategory) {
      throw ApiError.badRequest('Category is required');
    }

    const duplicateTaxRate = await prisma.dutyRate.findFirst({
      where: {
        category: normalizedCategory
      }
    });

    if (duplicateTaxRate) {
      throw ApiError.conflict('Tax rate for this category already exists. Please update the existing tax rate.');
    }

    const parsedRatePerLiter = parseOptionalNumber(ratePerLiter, 'ratePerLiter');
    const parsedRatePerUnit = parseOptionalNumber(ratePerUnit, 'ratePerUnit');

    if (parsedRatePerLiter == null && parsedRatePerUnit == null) {
      throw ApiError.badRequest('At least one of ratePerLiter or ratePerUnit is required');
    }

    const effectiveFromDate = parseRequiredDate(effectiveFrom, 'effectiveFrom');
    const effectiveToDate = parseOptionalDate(effectiveTo, 'effectiveTo');

    const taxRate = await prisma.dutyRate.create({
      data: {
        category: normalizedCategory,
        productId: null,
        ratePerLiter: parsedRatePerLiter,
        ratePerUnit: parsedRatePerUnit,
        legalReference,
        effectiveFrom: effectiveFromDate,
        effectiveTo: effectiveToDate,
        isActive: true
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'DutyRate',
      entityId: taxRate.id,
      description: `Created tax rate for category: ${category}`,
      newValues: { category, ratePerLiter, ratePerUnit },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, taxRate, 'Tax rate created successfully');
  } catch (error) {
    next(error);
  }
};

const updateTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, ratePerLiter, ratePerUnit, legalReference, effectiveFrom, effectiveTo, isActive } = req.body;

    const existing = await prisma.dutyRate.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Tax rate not found');
    }

    const nextCategoryRaw = category !== undefined ? category : existing.category;
    const normalizedCategory = normalizeTaxRateCategory(nextCategoryRaw);

    const duplicateTaxRate = await prisma.dutyRate.findFirst({
      where: {
        category: normalizedCategory,
        id: { not: id }
      }
    });

    if (duplicateTaxRate) {
      throw ApiError.conflict('Tax rate for this category already exists. Please update the existing tax rate.');
    }

    const parsedRatePerLiter = ratePerLiter !== undefined ? parseOptionalNumber(ratePerLiter, 'ratePerLiter') : undefined;
    const parsedRatePerUnit = ratePerUnit !== undefined ? parseOptionalNumber(ratePerUnit, 'ratePerUnit') : undefined;
    const parsedEffectiveFrom = effectiveFrom !== undefined ? parseRequiredDate(effectiveFrom, 'effectiveFrom') : undefined;
    const parsedEffectiveTo = effectiveTo !== undefined ? parseOptionalDate(effectiveTo, 'effectiveTo') : undefined;

    const taxRate = await prisma.dutyRate.update({
      where: { id },
      data: {
        ...(category !== undefined && { category: normalizedCategory }),
        productId: null,
        ...(parsedRatePerLiter !== undefined && { ratePerLiter: parsedRatePerLiter }),
        ...(parsedRatePerUnit !== undefined && { ratePerUnit: parsedRatePerUnit }),
        ...(legalReference !== undefined && { legalReference }),
        ...(parsedEffectiveFrom !== undefined && { effectiveFrom: parsedEffectiveFrom }),
        ...(parsedEffectiveTo !== undefined && { effectiveTo: parsedEffectiveTo }),
        ...(isActive !== undefined && { isActive })
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'DutyRate',
      entityId: id,
      description: `Updated tax rate: ${category}`,
      oldValues: { category: existing.category, ratePerLiter: existing.ratePerLiter },
      newValues: { category, ratePerLiter, ratePerUnit },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, taxRate, 'Tax rate updated successfully');
  } catch (error) {
    next(error);
  }
};

const toggleTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dutyRate.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Tax rate not found');
    }

    const taxRate = await prisma.dutyRate.update({
      where: { id },
      data: { isActive: !existing.isActive }
    });

    return ApiResponse.success(res, taxRate, `Tax rate ${taxRate.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateDutyForBatch,
  getDutyAssessments,
  getDutyAssessmentById,
  getOverdueDuties,
  updateDutyAssessmentStatus,
  getTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  toggleTaxRate
};
