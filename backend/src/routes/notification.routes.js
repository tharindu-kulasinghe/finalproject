const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const prisma = require('../prisma/client');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { unreadOnly, page = 1, limit = 50 } = req.query;
    const take = Math.min(parseInt(limit), 200);
    const skip = (parseInt(page) - 1) * take;

    const where = {
      userId: req.user.id,
      ...(String(unreadOnly) === 'true' ? { isRead: false } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.notification.count({ where }),
    ]);

    return ApiResponse.success(res, {
      notifications: items,
      pagination: { page: parseInt(page), limit: take, total },
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      throw ApiError.notFound('Notification not found');
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return ApiResponse.success(res, updated);
  } catch (e) {
    next(e);
  }
});

router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return ApiResponse.success(res, { success: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

