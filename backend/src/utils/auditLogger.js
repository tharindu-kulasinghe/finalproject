const prisma = require('../prisma/client');

const AUDIT_LOG_MAX = 50000;
const AUDIT_LOG_PRUNE_BATCH = 10;


const toJsonString = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};


const safeJsonParse = (str) => {
  if (!str) return null;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (error) {
    
    return str;
  }
};

const logAudit = async ({ userId, action, entityType, entityId, description, oldValues, newValues, ipAddress, userAgent }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        description,
        oldValues: toJsonString(oldValues),
        newValues: toJsonString(newValues),
        ipAddress,
        userAgent,
        occurredAt: new Date()
      }
    });

    
    const total = await prisma.auditLog.count();
    if (total > AUDIT_LOG_MAX) {
      const oldest = await prisma.auditLog.findMany({
        select: { id: true },
        orderBy: { occurredAt: 'asc' },
        take: AUDIT_LOG_PRUNE_BATCH,
      });
      const ids = oldest.map((x) => x.id);
      if (ids.length) {
        await prisma.auditLog.deleteMany({ where: { id: { in: ids } } });
      }
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

const getAuditLogs = async (filters = {}) => {
  const { userId, action, entityType, entityId, startDate, endDate, limit = 100, offset = 0 } = filters;
  
  const where = {};
  
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (startDate || endDate) {
    where.occurredAt = {};
    if (startDate) where.occurredAt.gte = new Date(startDate);
    if (endDate) where.occurredAt.lte = new Date(endDate);
  }
  
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: { id: true, fullName: true, email: true }
      }
    }
  });

  
  return logs.map(log => ({
    ...log,
    oldValues: log.oldValues ? safeJsonParse(log.oldValues) : null,
    newValues: log.newValues ? safeJsonParse(log.newValues) : null
  }));
};

module.exports = {
  logAudit,
  getAuditLogs,
  safeJsonParse
};
