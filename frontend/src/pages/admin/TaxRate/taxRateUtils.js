export const TAX_RATE_CATEGORY_OPTIONS = [
{ value: 'SPIRITS', label: 'Spirits' },
{ value: 'BEER', label: 'Beer' },
{ value: 'WINE', label: 'Wine' },
{ value: 'TOBACCO', label: 'Tobacco' },
{ value: 'ARRACK', label: 'Arrack' },
{ value: 'WHISKY', label: 'Whisky' },
{ value: 'BRANDY', label: 'Brandy' },
{ value: 'VODKA', label: 'Vodka' },
{ value: 'GIN', label: 'Gin' },
{ value: 'RUM', label: 'Rum' },
{ value: 'TODDY', label: 'Toddy' },
{ value: 'LIQUOR_BASED_PRODUCT', label: 'Liquor Based Product' },
{ value: 'OTHER', label: 'Other' }];


export const formatCategoryLabel = (value) => {
  if (!value) return '-';
  const normalized = String(value).
  toLowerCase().
  replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const getCategoryOptionsWithCurrent = (value) => {
  if (!value) return TAX_RATE_CATEGORY_OPTIONS;
  const exists = TAX_RATE_CATEGORY_OPTIONS.some((option) => option.value === value);
  if (exists) return TAX_RATE_CATEGORY_OPTIONS;
  return [{ value, label: formatCategoryLabel(value) }, ...TAX_RATE_CATEGORY_OPTIONS];
};