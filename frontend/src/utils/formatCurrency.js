


export const formatCurrency = (amount, currency = 'LKR') => {
  if (amount === null || amount === undefined) return '-';

  const num = Number(amount);
  if (isNaN(num)) return '-';

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('en-US').format(Number(num));
};