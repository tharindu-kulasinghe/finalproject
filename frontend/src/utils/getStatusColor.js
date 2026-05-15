


const statusColorMap = {

  ACTIVE: 'success',
  INACTIVE: 'default',
  PENDING: 'warning',
  DRAFT: 'default',


  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'danger',


  SUSPENDED: 'warning',
  REVOKED: 'danger',
  EXPIRED: 'danger',


  VERIFIED: 'success',
  FLAGGED: 'danger',


  CALCULATED: 'info',
  PART_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'danger',
  WAIVED: 'purple',


  DECLARED: 'info',
  UNDER_VERIFICATION: 'warning',


  GENERATED: 'default',
  ASSIGNED: 'info',
  ISSUED: 'success',
  VOID: 'default',
  RETURNED: 'warning',


  AUTHENTIC: 'success',
  INVALID: 'danger',
  PREVIOUSLY_SCANNED: 'warning',
  NOT_FOUND: 'danger',
  ERROR: 'danger'
};

const getStatusColor = (status) => {
  if (!status) return 'default';
  return statusColorMap[status.toUpperCase()] || 'default';
};

export default getStatusColor;