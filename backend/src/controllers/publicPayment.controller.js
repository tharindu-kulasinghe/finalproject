const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const {
  getIpayCheckoutUrl,
  getIpayMerchantWebToken,
  buildIpayCheckoutChecksum,
} = require('../utils/paymentIntegration');
const { DutyAssessmentStatus, PaymentStatus } = require('@prisma/client');

const PAYABLE_DUTY_STATUSES = [
  DutyAssessmentStatus.CALCULATED,
  DutyAssessmentStatus.PART_PAID,
  DutyAssessmentStatus.OVERDUE,
];

const safeTrimUpper = (value) => String(value || '').trim().toUpperCase();

const sumDutyBalance = (assessments) => {
  return (assessments || []).reduce((sum, assessment) => {
    const balance = Number(assessment.balanceAmount ?? 0);
    return sum + (Number.isFinite(balance) ? balance : 0);
  }, 0);
};

const getLicenseDueByNumber = async (req, res, next) => {
  try {
    const licenseNumber = String(req.params.licenseNumber || '').trim();
    if (!licenseNumber) throw ApiError.badRequest('License number is required');

    const license = await prisma.license.findUnique({
      where: { licenseNumber },
      select: {
        id: true,
        licenseNumber: true,
        type: true,
        status: true,
        companyName: true,
        dutyAssessments: {
          where: { status: { in: PAYABLE_DUTY_STATUSES } },
          select: { id: true, assessmentNo: true, status: true, assessedAmount: true, paidAmount: true, balanceAmount: true, dueDate: true },
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!license) throw ApiError.notFound('License not found');

    const totalDue = Number(sumDutyBalance(license.dutyAssessments).toFixed(2));

    return ApiResponse.success(res, {
      kind: 'LICENSE',
      license: {
        id: license.id,
        licenseNumber: license.licenseNumber,
        type: license.type,
        status: license.status,
        companyName: license.companyName,
      },
      suggestedAmount: totalDue,
      dutyAssessments: license.dutyAssessments,
    });
  } catch (error) {
    next(error);
  }
};


async function resolvePublicPaymentContext(body) {
  const {
    payFor,
    licenseNumber,
    batchNo,
    penaltyRef,
  } = body;

  const normalizedPayFor = safeTrimUpper(payFor);
  if (!normalizedPayFor) throw ApiError.badRequest('payFor is required');

  let resolvedLicenseId = null;
  let suggestedAmount = null;
  let contextLabel = null;
  let paymentCategoryTag = null;
  let penaltyRefClean = null;

  if (normalizedPayFor === 'LICENSE') {
    const ln = String(licenseNumber || '').trim();
    if (!ln) throw ApiError.badRequest('licenseNumber is required');

    const license = await prisma.license.findUnique({
      where: { licenseNumber: ln },
      select: {
        id: true,
        licenseNumber: true,
        dutyAssessments: {
          where: { status: { in: PAYABLE_DUTY_STATUSES } },
          select: { balanceAmount: true }
        }
      }
    });
    if (!license) throw ApiError.notFound('License not found');

    resolvedLicenseId = license.id;
    suggestedAmount = Number(sumDutyBalance(license.dutyAssessments).toFixed(2));
    contextLabel = `License ${license.licenseNumber}`;
    paymentCategoryTag = '[PAYMENT_CATEGORY:LICENSE_RENEWAL]';
  } else if (normalizedPayFor === 'BATCH') {
    const bn = String(batchNo || '').trim();
    if (!bn) throw ApiError.badRequest('batchNo is required');

    const batch = await prisma.productionBatch.findUnique({
      where: { batchNo: bn },
      select: {
        id: true,
        batchNo: true,
        licenseId: true,
        dutyAssessments: {
          where: { status: { in: PAYABLE_DUTY_STATUSES } },
          select: { balanceAmount: true }
        }
      }
    });
    if (!batch) throw ApiError.notFound('Batch not found');

    resolvedLicenseId = batch.licenseId;
    suggestedAmount = Number(sumDutyBalance(batch.dutyAssessments).toFixed(2));
    contextLabel = `Batch ${batch.batchNo}`;
    paymentCategoryTag = '[PAYMENT_CATEGORY:DUTY]';
  } else if (normalizedPayFor === 'PENALTY') {
    const pr = String(penaltyRef || '').trim();
    if (!pr) throw ApiError.badRequest('penaltyRef is required');
    penaltyRefClean = pr;

    const ln = String(licenseNumber || '').trim();
    if (!ln) throw ApiError.badRequest('licenseNumber is required for penalty payments');

    const license = await prisma.license.findUnique({ where: { licenseNumber: ln }, select: { id: true, licenseNumber: true } });
    if (!license) throw ApiError.notFound('License not found');
    resolvedLicenseId = license.id;
    contextLabel = `Penalty ${pr} (License ${license.licenseNumber})`;
    paymentCategoryTag = '[PAYMENT_CATEGORY:DUTY]';
    suggestedAmount = null;
  } else {
    throw ApiError.badRequest('Invalid payFor. Use LICENSE, BATCH, or PENALTY');
  }

  return {
    normalizedPayFor,
    resolvedLicenseId,
    suggestedAmount,
    contextLabel,
    paymentCategoryTag,
    penaltyRefClean,
  };
}

const getBatchDueByNumber = async (req, res, next) => {
  try {
    const batchNo = String(req.params.batchNo || '').trim();
    if (!batchNo) throw ApiError.badRequest('Batch number is required');

    const batch = await prisma.productionBatch.findUnique({
      where: { batchNo },
      select: {
        id: true,
        batchNo: true,
        status: true,
        productionDate: true,
        licenseId: true,
        product: { select: { name: true, category: true, code: true } },
        dutyAssessments: {
          where: { status: { in: PAYABLE_DUTY_STATUSES } },
          select: { id: true, assessmentNo: true, status: true, assessedAmount: true, paidAmount: true, balanceAmount: true, dueDate: true },
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!batch) throw ApiError.notFound('Batch not found');

    const totalDue = Number(sumDutyBalance(batch.dutyAssessments).toFixed(2));

    return ApiResponse.success(res, {
      kind: 'BATCH',
      batch: {
        id: batch.id,
        batchNo: batch.batchNo,
        status: batch.status,
        productionDate: batch.productionDate,
        product: batch.product,
      },
      licenseId: batch.licenseId,
      suggestedAmount: totalDue,
      dutyAssessments: batch.dutyAssessments,
    });
  } catch (error) {
    next(error);
  }
};

const declarePublicPayment = async (req, res, next) => {
  try {
    const {
      payFor,
      licenseNumber,
      batchNo,
      penaltyRef,
      method,
      bankName,
      bankBranch,
      bankReference,
      declaredAmount,
      payerName,
      payerContact,
      remarks
    } = req.body;

    const normalizedMethod = safeTrimUpper(method || 'BANK_TRANSFER');

    if (normalizedMethod !== 'BANK_TRANSFER') throw ApiError.badRequest('Only BANK_TRANSFER is supported');

    if (!bankReference) throw ApiError.badRequest('Bank reference is required');
    const uploadedProofUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if (!uploadedProofUrl) throw ApiError.badRequest('Payment proof image is required');

    const {
      normalizedPayFor,
      resolvedLicenseId,
      suggestedAmount,
      contextLabel,
      paymentCategoryTag,
      penaltyRefClean,
    } = await resolvePublicPaymentContext({
      payFor,
      licenseNumber,
      batchNo,
      penaltyRef,
    });

    const amountRaw = declaredAmount !== undefined && declaredAmount !== null && declaredAmount !== ''
      ? Number(declaredAmount)
      : suggestedAmount;

    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      throw ApiError.badRequest('Declared amount must be a positive number');
    }

    const paymentCount = await prisma.payment.count();
    const paymentRef = `PUB-${Date.now()}-${paymentCount + 1}`;

    const extra = [
      paymentCategoryTag,
      `[PUBLIC_PAYMENT]`,
      contextLabel ? `[CONTEXT:${contextLabel}]` : null,
      payerName ? `[PAYER:${String(payerName).trim()}]` : null,
      payerContact ? `[CONTACT:${String(payerContact).trim()}]` : null,
      penaltyRefClean ? `[PENALTY_REF:${penaltyRefClean}]` : null,
      remarks ? String(remarks).trim() : null,
    ].filter(Boolean).join(' ').trim();

    const payment = await prisma.payment.create({
      data: {
        paymentRef,
        method: 'BANK_TRANSFER',
        status: PaymentStatus.DECLARED,
        declaredAmount: Number(amountRaw.toFixed(2)),
        bankName: bankName || null,
        bankBranch: bankBranch || null,
        bankReference: bankReference || null,
        proofUrl: uploadedProofUrl,
        depositedAt: new Date(),
        declaredAt: new Date(),
        remarks: extra || null,
        licenseId: resolvedLicenseId,
        declaredById: null,
      },
      include: {
        license: { select: { id: true, licenseNumber: true, companyName: true } }
      }
    });

    return ApiResponse.created(res, payment, 'Payment declared successfully');
  } catch (error) {
    next(error);
  }
};

const prepareIpayCheckout = async (req, res, next) => {
  try {
    const token = getIpayMerchantWebToken();
    if (!token) {
      throw new ApiError(
        503,
        'iPay is not configured: set IPAY_MERCHANT_WEB_TOKEN in backend/.env to your IPG token from the merchant portal, save the file, then restart the API server. Use double quotes if the token has special characters.'
      );
    }

    const {
      payFor,
      licenseNumber,
      batchNo,
      penaltyRef,
      declaredAmount,
      payerName,
      payerContact,
      customerEmail,
      paymentMethod,
      remarks,
    } = req.body;

    const ctx = await resolvePublicPaymentContext({
      payFor,
      licenseNumber,
      batchNo,
      penaltyRef,
    });

    const amountRaw = declaredAmount !== undefined && declaredAmount !== null && declaredAmount !== ''
      ? Number(declaredAmount)
      : ctx.suggestedAmount;

    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      throw ApiError.badRequest('Amount must be a positive number');
    }

    const totalAmountStr = Number(amountRaw.toFixed(2)).toFixed(2);

    const paymentCount = await prisma.payment.count();
    const orderRef = `IPG${Date.now()}${paymentCount + 1}`.slice(0, 95);

    const extraParts = [
      ctx.paymentCategoryTag,
      '[PUBLIC_PAYMENT]',
      '[IPAY_PENDING]',
      ctx.contextLabel ? `[CONTEXT:${ctx.contextLabel}]` : null,
      payerName ? `[PAYER:${String(payerName).trim()}]` : null,
      payerContact ? `[CONTACT:${String(payerContact).trim()}]` : null,
      ctx.penaltyRefClean ? `[PENALTY_REF:${ctx.penaltyRefClean}]` : null,
      remarks ? String(remarks).trim() : null,
    ].filter(Boolean).join(' ').trim();

    await prisma.payment.create({
      data: {
        paymentRef: orderRef,
        method: 'PAYMENT_GATEWAY',
        status: PaymentStatus.DECLARED,
        declaredAmount: Number(amountRaw.toFixed(2)),
        bankName: null,
        bankBranch: null,
        bankReference: null,
        proofUrl: null,
        depositedAt: new Date(),
        declaredAt: new Date(),
        remarks: extraParts || null,
        licenseId: ctx.resolvedLicenseId,
        declaredById: null,
      },
    });

    const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const returnUrl = `${frontendBase}/tax-payments?ipay=ok&orderId=${encodeURIComponent(orderRef)}`;
    const cancelUrl = `${frontendBase}/tax-payments?ipay=cancel`;

    const fields = {
      merchantWebToken: token,
      returnUrl,
      cancelUrl,
      totalAmount: totalAmountStr,
      orderId: orderRef,
      orderDescription: (ctx.contextLabel || 'Tax payment').slice(0, 200),
      customerName: String(payerName || '').slice(0, 250),
      customerPhone: String(payerContact || '').replace(/\D/g, '').slice(0, 15),
      customerEmail: String(customerEmail || '').slice(0, 100),
    };

    const pm = safeTrimUpper(paymentMethod);
    if (pm === 'VISA' || pm === 'MC' || pm === 'IPAY' || pm === 'LQR') {
      fields.paymentMethod = pm;
    }

    const checksum = buildIpayCheckoutChecksum({
      merchantWebToken: token,
      orderId: orderRef,
      totalAmountStr,
    });
    if (checksum) fields.checksum = checksum;

    return ApiResponse.success(res, {
      action: getIpayCheckoutUrl(),
      fields,
      orderRef,
    }, 'Redirect to iPay with returned fields');
  } catch (error) {
    next(error);
  }
};

const ipayCallback = async (req, res) => {
  try {
    const b = req.body || {};
    const orderId = String(b.orderId ?? b.order_id ?? '').trim();
    if (!orderId) {
      return res.status(200).send('OK');
    }

    const payment = await prisma.payment.findUnique({ where: { paymentRef: orderId } });
    if (!payment || payment.method !== 'PAYMENT_GATEWAY') {
      console.warn('[ipay] callback unknown or non-gateway order', orderId);
      return res.status(200).send('OK');
    }

    const txRef = String(b.transactionReference ?? '').trim();
    const txAmt = Number(b.transactionAmount);
    const txStatus = String(b.transactionStatus ?? '').trim().toUpperCase();

    if (txStatus === 'A') {
      if (!Number.isFinite(txAmt) || Math.abs(txAmt - payment.declaredAmount) > 0.02) {
        console.error('[ipay] amount mismatch', txAmt, payment.declaredAmount);
        return res.status(200).send('OK');
      }
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.VERIFIED,
          verifiedAmount: Number(txAmt.toFixed(2)),
          verifiedAt: new Date(),
          bankReference: txRef || null,
        },
      });
      return res.status(200).send('OK');
    }

    if (txStatus === 'D') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REJECTED,
          rejectionReason: String(b.transactionMessage || 'Declined').slice(0, 500),
          bankReference: txRef || null,
        },
      });
      return res.status(200).send('OK');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        remarks: `${payment.remarks || ''} [IPAY_STATUS:${txStatus}]`.slice(0, 4000),
        bankReference: txRef || payment.bankReference,
      },
    });
    return res.status(200).send('OK');
  } catch (e) {
    console.error('[ipay] callback error', e);
    return res.status(500).send('error');
  }
};

module.exports = {
  getLicenseDueByNumber,
  getBatchDueByNumber,
  declarePublicPayment,
  prepareIpayCheckout,
  ipayCallback,
};

