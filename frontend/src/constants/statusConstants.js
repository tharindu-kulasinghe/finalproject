




export const UserStatus = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
});

export const ApplicationStatus = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED'
});


export const APPLICATION_IN_REVIEW_STATUSES = Object.freeze([
ApplicationStatus.SUBMITTED,
ApplicationStatus.UNDER_REVIEW]
);

export const LicenseStatus = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
});

export const BatchStatus = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  FLAGGED: 'FLAGGED'
});

export const DutyAssessmentStatus = Object.freeze({
  CALCULATED: 'CALCULATED',
  PART_PAID: 'PART_PAID',
  OVERDUE: 'OVERDUE',
  PAID: 'PAID',
  WAIVED: 'WAIVED',
  CANCELLED: 'CANCELLED'
});

export const PaymentStatus = Object.freeze({
  DECLARED: 'DECLARED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
});

export const isPaymentReviewable = (status) =>
status === PaymentStatus.DECLARED || status === PaymentStatus.UNDER_VERIFICATION;


export const isPaymentVerified = (status) => status === PaymentStatus.VERIFIED;

export const PAYMENT_PENDING_REVIEW_STATUSES = Object.freeze([
PaymentStatus.DECLARED,
PaymentStatus.UNDER_VERIFICATION]
);

export const StampRequestStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED',
  ISSUED: 'ISSUED'
});

export const TaxStampStatus = Object.freeze({
  GENERATED: 'GENERATED',
  ASSIGNED: 'ASSIGNED',
  ACTIVE: 'ACTIVE',
  VOID: 'VOID',
  FLAGGED: 'FLAGGED'
});

export const isTaxStampInCirculation = (stamp) =>
stamp?.status === TaxStampStatus.ACTIVE || stamp?.status === TaxStampStatus.ASSIGNED;

export const isTaxStampExpiredByDate = (stamp) => {
  if (!stamp?.expiresAt) return false;
  return new Date(stamp.expiresAt).getTime() < Date.now();
};

export const DistributionOrderStatus = Object.freeze({
  PENDING: 'PENDING',
  DISPATCHED: 'DISPATCHED',
  RECEIVED: 'RECEIVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
});

export const PAYABLE_DUTY_ASSESSMENT_STATUSES = Object.freeze([
DutyAssessmentStatus.CALCULATED,
DutyAssessmentStatus.PART_PAID,
DutyAssessmentStatus.OVERDUE]
);
