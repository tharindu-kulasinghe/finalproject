const crypto = require('crypto');

const getStampEncryptionKey = () => {
  const secret =
    process.env.STAMP_QR_SECRET ||
    process.env.JWT_SECRET ||
    'iecms-stamp-secret-change-me';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const encryptStampPayload = (payload) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getStampEncryptionKey(), iv);
  const jsonPayload = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(jsonPayload, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `QR1.${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
};

const generateQRValue = (payload = {}) => {
  return encryptStampPayload({
    ...payload,
    nonce: crypto.randomBytes(8).toString('hex'),
    generatedAt: new Date().toISOString()
  });
};

const decryptStampPayload = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith('QR1.')) return null;

  const parts = trimmed.split('.');
  if (parts.length !== 4) return null;

  try {
    const [, ivPart, authTagPart, encryptedPart] = parts;
    const iv = Buffer.from(ivPart, 'base64url');
    const authTag = Buffer.from(authTagPart, 'base64url');
    const encrypted = Buffer.from(encryptedPart, 'base64url');

    const decipher = crypto.createDecipheriv('aes-256-gcm', getStampEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const payload = JSON.parse(decrypted);

    return payload && typeof payload === 'object' ? payload : null;
  } catch (_) {
    return null;
  }
};

const generateCodeValue = () => {
  const random = crypto.randomBytes(10).toString('hex').toUpperCase();
  return `IECMS-${random}`;
};

const generateCryptoHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const generateSerialNo = (prefix = 'STAMP') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = {
  generateQRValue,
  decryptStampPayload,
  generateCodeValue,
  generateCryptoHash,
  generateSerialNo
};
