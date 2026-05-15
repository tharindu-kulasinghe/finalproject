export const canReviewRequest = (status) => status === 'PENDING';

export const canIssueRequest = (status) => status === 'APPROVED';

export const reviewerLabel = (request) => {
  if (!request?.reviewedBy?.fullName) return '-';
  const role = request.reviewedBy?.role === 'ADMIN' ? 'Admin' : request.reviewedBy?.role === 'ED_OFFICER' ? 'Excise Officer' : '';
  return role ? `${request.reviewedBy.fullName} (${role})` : request.reviewedBy.fullName;
};

export const manufacturerLabel = (request) => {
  return request?.requestedBy?.companyName || request?.license?.companyName || request?.requestedBy?.fullName || '-';
};