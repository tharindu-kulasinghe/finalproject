export const PAYMENT_TAG_REGEX = /\[PAYMENT_CATEGORY:(DUTY|LICENSE_RENEWAL)\]/i;

export const getPaymentCategory = (payment) => {
  const match = payment?.remarks?.match(PAYMENT_TAG_REGEX);
  if (match?.[1]) return match[1].toUpperCase();
  if ((payment?._count?.allocations || payment?.allocations?.length || 0) > 0) return 'DUTY';
  return 'LICENSE_RENEWAL';
};

export const sanitizeRemarks = (remarks) => {
  if (!remarks) return '-';
  return remarks.replace(PAYMENT_TAG_REGEX, '').trim() || '-';
};

export const methodLabel = (method) => {
  if (method === 'PAYMENT_GATEWAY') return 'Payment Gateway (iPay)';
  if (method === 'BANK_TRANSFER') return 'Bank Transfer';
  return method || '-';
};