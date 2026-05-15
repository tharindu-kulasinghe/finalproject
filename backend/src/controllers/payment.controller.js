const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { UserRole, PaymentStatus, DutyAssessmentStatus } = require('@prisma/client');

const PAYMENT_METHODS = ['PAYMENT_GATEWAY', 'BANK_TRANSFER'];
const PAYMENT_CATEGORIES = ['DUTY', 'LICENSE_RENEWAL'];
const PAYMENT_CATEGORY_REGEX = /\[PAYMENT_CATEGORY:(DUTY|LICENSE_RENEWAL)\]/i;

const buildPaymentCategoryTag = (category) => {
  if (!category) return '';
  const normalized = String(category).toUpperCase();
  if (!PAYMENT_CATEGORIES.includes(normalized)) return '';
  return `[PAYMENT_CATEGORY:${normalized}]`;
};

const mergeCategoryTagWithRemarks = (existingRemarks, incomingRemarks) => {
  const existingTag = existingRemarks?.match(PAYMENT_CATEGORY_REGEX)?.[0] || '';
  const cleanIncoming = String(incomingRemarks || '')
    .replace(PAYMENT_CATEGORY_REGEX, '')
    .trim();

  return [existingTag, cleanIncoming].filter(Boolean).join(' ').trim() || null;
};

const declarePayment = async (req, res, next) => {
  try {
    const {
      licenseId,
      method,
      declaredAmount,
      bankName,
      bankBranch,
      bankReference,
      depositedAt,
      proofUrl,
      remarks,
      paymentCategory
    } = req.body;

    if (!licenseId || !method || !declaredAmount) {
      throw ApiError.badRequest('License, method and amount are required');
    }

    const normalizedMethod = String(method).toUpperCase();
    if (!PAYMENT_METHODS.includes(normalizedMethod)) {
      throw ApiError.badRequest('Invalid payment method. Use PAYMENT_GATEWAY or BANK_TRANSFER');
    }

    const amount = Number(declaredAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw ApiError.badRequest('Declared amount must be a positive number');
    }

    const uploadedProofUrl = req.file ? `/uploads/${req.file.filename}` : proofUrl;

    if (normalizedMethod === 'BANK_TRANSFER') {
      if (!bankReference) {
        throw ApiError.badRequest('Bank reference is required for bank transfer');
      }
      if (!uploadedProofUrl) {
        throw ApiError.badRequest('Payment proof image is required for bank transfer');
      }
    }

    const resolvedDepositedAt = normalizedMethod === 'BANK_TRANSFER'
      ? (depositedAt ? new Date(depositedAt) : new Date())
      : (depositedAt ? new Date(depositedAt) : null);

    const categoryTag = buildPaymentCategoryTag(paymentCategory);
    const mergedRemarks = [categoryTag, remarks].filter(Boolean).join(' ').trim();

    const license = await prisma.license.findUnique({
      where: { id: licenseId }
    });

    if (!license) {
      throw ApiError.notFound('License not found');
    }

    if (license.holderId !== req.user.id && ![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You can only declare payments for your own license');
    }

    const paymentCount = await prisma.payment.count();
    const paymentRef = `PAY-${Date.now()}-${paymentCount + 1}`;

    const payment = await prisma.payment.create({
      data: {
        paymentRef,
        method: normalizedMethod,
        declaredAmount: amount,
        status: PaymentStatus.DECLARED,
        declaredAt: new Date(),
        bankName,
        bankBranch,
        bankReference,
        proofUrl: uploadedProofUrl || null,
        remarks: mergedRemarks || null,
        depositedAt: resolvedDepositedAt,
        licenseId,
        declaredById: req.user.id
      },
      include: {
        license: {
          select: { id: true, licenseNumber: true, companyName: true }
        },
        declaredBy: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'Payment',
      entityId: payment.id,
      description: `Declared payment: ${paymentRef}`,
      newValues: { declaredAmount, paymentRef },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, payment, 'Payment declared successfully');
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { status, licenseId, declaredById, method, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;
    if (licenseId) where.licenseId = licenseId;
    if (declaredById) where.declaredById = declaredById;
    if (method) where.method = String(method).toUpperCase();

    if (req.user.role === UserRole.MANUFACTURER) {
      where.license = { holderId: req.user.id };
    } else if (![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view payments');
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          license: {
            select: { id: true, licenseNumber: true, companyName: true }
          },
          declaredBy: {
            select: { id: true, fullName: true }
          },
          verifiedBy: {
            select: { id: true, fullName: true }
          },
          _count: {
            select: {
              allocations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.payment.count({ where })
    ]);

    return ApiResponse.success(res, {
      payments,
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

const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        license: {
          select: { id: true, holderId: true, licenseNumber: true, companyName: true, type: true }
        },
        declaredBy: {
          select: { id: true, fullName: true, email: true }
        },
        verifiedBy: {
          select: { id: true, fullName: true, email: true }
        },
        allocations: {
          include: {
            dutyAssessment: {
              select: { id: true, assessmentNo: true, assessedAmount: true, balanceAmount: true }
            }
          }
        }
      }
    });

    if (!payment) {
      throw ApiError.notFound('Payment not found');
    }

    if (req.user.role === UserRole.MANUFACTURER && payment.license?.holderId !== req.user.id) {
      throw ApiError.forbidden('You can only view your own payments');
    }

    if (![UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view this payment');
    }

    return ApiResponse.success(res, payment);
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verifiedAmount, status, rejectionReason, proofUrl, remarks } = req.body;

    const payment = await prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw ApiError.notFound('Payment not found');
    }

    if (payment.status !== PaymentStatus.DECLARED && payment.status !== PaymentStatus.UNDER_VERIFICATION) {
      throw ApiError.badRequest('Payment cannot be verified in current status');
    }

    const normalizedStatus = status ? String(status).toUpperCase() : PaymentStatus.VERIFIED;
    if (![PaymentStatus.VERIFIED, PaymentStatus.REJECTED].includes(normalizedStatus)) {
      throw ApiError.badRequest('Invalid status. Use VERIFIED or REJECTED');
    }

    if (normalizedStatus === PaymentStatus.REJECTED && !rejectionReason) {
      throw ApiError.badRequest('Rejection reason is required when rejecting payment');
    }

    const updateData = {
      status: normalizedStatus,
      verifiedAt: new Date(),
      verifiedById: req.user.id
    };

    if (verifiedAmount !== undefined) {
      const verified = Number(verifiedAmount);
      if (!Number.isFinite(verified) || verified < 0) {
        throw ApiError.badRequest('Verified amount must be a valid non-negative number');
      }
      updateData.verifiedAmount = verified;
    } else if (normalizedStatus === PaymentStatus.VERIFIED) {
      updateData.verifiedAmount = payment.declaredAmount;
    }

    if (proofUrl) updateData.proofUrl = proofUrl;
    if (remarks !== undefined) updateData.remarks = mergeCategoryTagWithRemarks(payment.remarks, remarks);
    if (normalizedStatus === PaymentStatus.REJECTED) updateData.rejectionReason = rejectionReason;

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        license: { select: { id: true, licenseNumber: true, companyName: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: normalizedStatus === PaymentStatus.REJECTED ? 'REJECT' : 'VERIFY',
      entityType: 'Payment',
      entityId: id,
      description: `${normalizedStatus === PaymentStatus.REJECTED ? 'Rejected' : 'Verified'} payment: ${payment.paymentRef}`,
      oldValues: { status: payment.status },
      newValues: { status: updateData.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedPayment, `Payment ${updateData.status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
};

const allocatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dutyAssessmentIds, amounts } = req.body;

    if (!dutyAssessmentIds || !Array.isArray(dutyAssessmentIds) || dutyAssessmentIds.length === 0) {
      throw ApiError.badRequest('Duty assessment IDs are required');
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { allocations: true }
    });

    if (!payment) {
      throw ApiError.notFound('Payment not found');
    }

    if (payment.status !== PaymentStatus.VERIFIED) {
      throw ApiError.badRequest('Only verified payments can be allocated');
    }

    const totalAllocated = payment.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const availableAmount = (payment.verifiedAmount || payment.declaredAmount) - totalAllocated;

    let totalNewAllocation = 0;
    if (amounts) {
      totalNewAllocation = amounts.reduce((sum, a) => sum + a, 0);
    } else {
      totalNewAllocation = dutyAssessmentIds.length > 0 ? availableAmount / dutyAssessmentIds.length : 0;
    }

    if (totalNewAllocation > availableAmount) {
      throw ApiError.badRequest('Allocation exceeds available payment amount');
    }

    const allocations = [];

    for (let i = 0; i < dutyAssessmentIds.length; i++) {
      const dutyAssessmentId = dutyAssessmentIds[i];
      const allocationAmount = amounts ? amounts[i] : totalNewAllocation;

      const existingAllocation = await prisma.paymentAllocation.findFirst({
        where: { paymentId: id, dutyAssessmentId }
      });

      if (existingAllocation) {
        const updatedAllocation = await prisma.paymentAllocation.update({
          where: { id: existingAllocation.id },
          data: { allocatedAmount: existingAllocation.allocatedAmount + allocationAmount }
        });
        allocations.push(updatedAllocation);
      } else {
        const newAllocation = await prisma.paymentAllocation.create({
          data: {
            paymentId: id,
            dutyAssessmentId,
            allocatedAmount: allocationAmount
          }
        });
        allocations.push(newAllocation);
      }

      const assessment = await prisma.dutyAssessment.findUnique({
        where: { id: dutyAssessmentId }
      });

      if (assessment) {
        const newPaidAmount = assessment.paidAmount + allocationAmount;
        const newBalanceAmount = assessment.assessedAmount - newPaidAmount;
        
        await prisma.dutyAssessment.update({
          where: { id: dutyAssessmentId },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newBalanceAmount <= 0
              ? DutyAssessmentStatus.PAID
              : newPaidAmount > 0
                ? DutyAssessmentStatus.PART_PAID
                : assessment.status
          }
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'Payment',
      entityId: id,
      description: `Allocated payment ${payment.paymentRef} to ${dutyAssessmentIds.length} duty assessments`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, allocations, 'Payment allocated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  declarePayment,
  getPayments,
  getPaymentById,
  verifyPayment,
  allocatePayment
};
