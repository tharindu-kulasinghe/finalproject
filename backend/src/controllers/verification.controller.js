const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { decryptStampPayload } = require('../utils/qrGenerator');
const { TaxStampStatus } = require('@prisma/client');

const toNullableFloat = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const addCandidate = (set, value) => {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed) return;
  set.add(trimmed);
};

const buildLookupCandidates = (codeValue, qrValue) => {
  const candidates = new Set();

  addCandidate(candidates, codeValue);
  addCandidate(candidates, qrValue);

  const initialValues = Array.from(candidates);

  for (const value of initialValues) {
    try {
      const decoded = decodeURIComponent(value);
      addCandidate(candidates, decoded);
    } catch (_) {
      
    }

    const qrPrefixIndex = value.indexOf('QR1.');
    if (qrPrefixIndex > 0) {
      addCandidate(candidates, value.slice(qrPrefixIndex));
    }

    try {
      const parsed = new URL(value);
      addCandidate(candidates, parsed.searchParams.get('code'));
      addCandidate(candidates, parsed.searchParams.get('codeValue'));
      addCandidate(candidates, parsed.searchParams.get('qr'));
      addCandidate(candidates, parsed.searchParams.get('qrValue'));
      addCandidate(candidates, parsed.searchParams.get('stamp'));
      addCandidate(candidates, parsed.searchParams.get('token'));
      addCandidate(candidates, parsed.searchParams.get('value'));

      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        addCandidate(candidates, pathSegments[pathSegments.length - 1]);
      }
    } catch (_) {
      
    }
  }

  const resolvedValues = Array.from(candidates);
  for (const value of resolvedValues) {
    const decryptedPayload = decryptStampPayload(value);
    if (!decryptedPayload) continue;
    addCandidate(candidates, decryptedPayload.codeValue);
    addCandidate(candidates, decryptedPayload.qrValue);
    addCandidate(candidates, decryptedPayload.serialNo);
  }

  return Array.from(candidates);
};

const verifyStamp = async (req, res, next) => {
  try {
    const { codeValue, qrValue, channel } = req.body;
    const normalizedChannel = channel || 'PUBLIC_PORTAL';
    const isPublicChannel = normalizedChannel === 'PUBLIC_PORTAL';
    const scannedInput = (qrValue || codeValue || '').trim();
    const lookupValues = buildLookupCandidates(codeValue, qrValue);

    if (!lookupValues.length) {
      throw ApiError.badRequest('Code value or QR value is required');
    }

    const taxStamp = await prisma.taxStamp.findFirst({
      where: {
        OR: lookupValues.flatMap((value) => ([
          { codeValue: value },
          { qrValue: value }
        ]))
      },
      include: {
        product: {
          select: { id: true, name: true, code: true, category: true }
        },
        batch: {
          select: { id: true, batchNo: true, productionDate: true }
        },
        stampRequest: {
          select: {
            requestNo: true,
            requestedBy: {
              select: { id: true, fullName: true, companyName: true, email: true, address: true, mobile: true }
            }
          }
        }
      }
    });

    let result;
    let message;

    if (!taxStamp) {
      result = 'NOT_FOUND';
      message = 'Tax stamp not found in the system';
    } else if (taxStamp.status === TaxStampStatus.VOID) {
      result = 'INVALID';
      message = 'This tax stamp has been voided';
    } else if (taxStamp.status === TaxStampStatus.GENERATED) {
      result = 'INVALID';
      message = 'This tax stamp has not been activated yet';
    } else if (taxStamp.expiresAt && new Date(taxStamp.expiresAt) < new Date()) {
      result = 'EXPIRED';
      message = 'This tax stamp has expired';
    } else if (taxStamp.suspiciousFlag) {
      result = 'FLAGGED';
      message = taxStamp.suspiciousReason || 'This tax stamp has been flagged as suspicious';
    } else if (taxStamp.firstVerifiedAt) {
      result = 'PREVIOUSLY_SCANNED';
      message = `This tax stamp was first verified on ${taxStamp.firstVerifiedAt.toISOString()}`;
    } else {
      result = 'AUTHENTIC';
      message = 'This tax stamp is authentic';
    }

    const verificationLog = await prisma.verificationLog.create({
      data: {
        channel: normalizedChannel,
        result,
        scannedValue: scannedInput || lookupValues[0],
        scannedLocation: req.body.scannedLocation,
        latitude: toNullableFloat(req.body.latitude),
        longitude: toNullableFloat(req.body.longitude),
        deviceInfo: req.body.deviceInfo,
        ipAddress: req.ip,
        taxStampId: taxStamp?.id,
        batchId: taxStamp?.batchId,
        verifiedAt: new Date()
      }
    });

    if (taxStamp && result === 'AUTHENTIC' && isPublicChannel) {
      const updateData = {
        status: TaxStampStatus.ACTIVE,
        activatedAt: new Date(),
        firstVerifiedAt: new Date(),
        lastVerifiedAt: new Date()
      };

      await prisma.taxStamp.update({
        where: { id: taxStamp.id },
        data: updateData
      });
    } else if (taxStamp && isPublicChannel && (result === 'PREVIOUSLY_SCANNED' || result === 'FLAGGED')) {
      await prisma.taxStamp.update({
        where: { id: taxStamp.id },
        data: {
          lastVerifiedAt: new Date()
        }
      });
    }

    let publicScanCount = 0;
    if (taxStamp?.id) {
      publicScanCount = await prisma.verificationLog.count({
        where: {
          taxStampId: taxStamp.id,
          channel: 'PUBLIC_PORTAL'
        }
      });
    }

    const response = {
      result,
      message,
      verificationId: verificationLog.id,
      scannedAt: verificationLog.verifiedAt,
      publicScanCount
    };

    const manufacturerInfo = taxStamp?.stampRequest?.requestedBy
      ? {
          id: taxStamp.stampRequest.requestedBy.id,
          fullName: taxStamp.stampRequest.requestedBy.fullName,
          companyName: taxStamp.stampRequest.requestedBy.companyName,
          email: taxStamp.stampRequest.requestedBy.email,
          address: taxStamp.stampRequest.requestedBy.address,
          mobile: taxStamp.stampRequest.requestedBy.mobile
        }
      : null;

    if (taxStamp) {
      response.stamp = {
        id: taxStamp.id,
        codeValue: taxStamp.codeValue,
        status: taxStamp.status,
        product: taxStamp.product,
        batch: taxStamp.batch,
        manufacturer: manufacturerInfo,
        firstVerifiedAt: taxStamp.firstVerifiedAt,
        lastVerifiedAt: taxStamp.lastVerifiedAt,
        publicScanCount
      };
    }

    return ApiResponse.success(res, response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyStamp
};
