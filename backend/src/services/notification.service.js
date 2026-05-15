const prisma = require('../prisma/client');

async function createNotification({ userId, type, title, message, link, dedupeKey }) {
  try {
    if (dedupeKey) {
      const existing = await prisma.notification.findUnique({ where: { dedupeKey } });
      if (existing) return existing;
    }
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
        dedupeKey: dedupeKey || null,
      },
    });
  } catch (e) {
    
    if (dedupeKey) {
      const existing = await prisma.notification.findUnique({ where: { dedupeKey } });
      if (existing) return existing;
    }
    throw e;
  }
}

async function listNotifications({ userId, limit = 50, offset = 0, unreadOnly = false }) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

async function markRead({ userId, id }) {
  return prisma.notification.update({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

async function markAllRead({ userId }) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

module.exports = {
  createNotification,
  listNotifications,
  markRead,
  markAllRead,
};

