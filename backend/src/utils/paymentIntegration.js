const crypto = require('crypto');

function getIpayMode() {
  return String(process.env.IPAY_MODE || 'sandbox').trim().toLowerCase();
}

function getIpayCheckoutUrl() {
  return getIpayMode() === 'live' ? 'https://ipay.lk/ipg/checkout' : 'https://sandbox.ipay.lk/ipg/checkout';
}

function getIpayMerchantWebToken() {
  const raw = process.env.IPAY_MERCHANT_WEB_TOKEN || process.env.IPAY_TOKEN || '';
  return String(raw).trim();
}

function getIpaySecret() {
  return String(process.env.IPAY_SECRET || '').trim();
}

function isIpayConfigured() {
  return Boolean(getIpayMerchantWebToken());
}

function buildIpayCheckoutChecksum({ merchantWebToken, orderId, totalAmountStr }) {
  const secret = getIpaySecret();
  if (!secret) return null;
  const message = `${merchantWebToken}${orderId}${totalAmountStr}`;
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('base64');
}

module.exports = {
  getIpayMode,
  getIpayCheckoutUrl,
  getIpayMerchantWebToken,
  getIpaySecret,
  isIpayConfigured,
  buildIpayCheckoutChecksum,
};
