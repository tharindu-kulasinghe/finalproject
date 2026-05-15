export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export const formatCurrency = (amount, currency = 'LKR') => {
  if (amount === null || amount === undefined) return 'N/A';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount} ${currency}`;
  }
};

export const formatNumber = (number, decimals = 2) => {
  if (number === null || number === undefined) return 'N/A';

  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  } catch (error) {
    console.error('Error formatting number:', error);
    return number.toString();
  }
};

export const formatLicenseType = (licenseType) => {
  if (!licenseType) return 'N/A';

  const typeMap = {
    MANUFACTURING: 'Manufacturing',
    DISTRIBUTION: 'Distribution',
    RETAIL: 'Retail',
    BAR: 'Bar',
    RESTAURANT: 'Restaurant',
    HOTEL: 'Hotel',
    CLUB: 'Club',
    WAREHOUSE: 'Warehouse'
  };

  return typeMap[licenseType] || licenseType;
};

export const formatUserRole = (role) => {
  if (!role) return 'N/A';

  const roleMap = {
    SUPER_ADMIN: 'Super Admin',
    ED_OFFICER: 'Excise Officer',
    MANUFACTURER: 'Manufacturer',
    DISTRIBUTOR: 'Distributor',
    RETAILER: 'Retailer',
    LICENSE_HOLDER: 'License Holder'
  };

  return roleMap[role] || role;
};

export const formatStatus = (status) => {
  if (!status) return 'N/A';

  const statusMap = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
    EXPIRED: 'Expired',
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    DISPATCHED: 'Dispatched',
    RECEIVED: 'Received',
    CANCELLED: 'Cancelled'
  };

  return statusMap[status] || status;
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }

  return phone;
};