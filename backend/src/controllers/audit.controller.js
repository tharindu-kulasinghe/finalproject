const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { getAuditLogs: getAuditLogsUtil, safeJsonParse } = require('../utils/auditLogger');

const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityType, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const filters = {
      action,
      entityType,
      userId,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: skip
    };

    const logs = await getAuditLogsUtil(filters);
    const total = await prisma.auditLog.count({
      where: {
        ...(action && { action }),
        ...(entityType && { entityType }),
        ...(userId && { userId }),
        ...((startDate || endDate) && {
          occurredAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        })
      }
    });

    return ApiResponse.success(res, {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      }
    });

    if (!log) {
      throw ApiError.notFound('Audit log not found');
    }

    
    const parsedLog = {
      ...log,
      oldValues: safeJsonParse(log.oldValues),
      newValues: safeJsonParse(log.newValues)
    };

    return ApiResponse.success(res, parsedLog);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById
};
