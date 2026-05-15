const prisma = require('../prisma/client');
const { DutyAssessmentStatus, LicenseStatus } = require('@prisma/client');
const { createNotification } = require('../services/notification.service');
const { sendEmail } = require('../utils/email');

function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function money(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return String(n ?? '');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function runDueReminders({ wsHub }) {
  const now = new Date();
  const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

  const dueReminderDays = process.env.DUE_REMINDER_LOOKAHEAD_DAYS
    ? Number(process.env.DUE_REMINDER_LOOKAHEAD_DAYS)
    : 3;
  const licenseExpiryDays = process.env.LICENSE_EXPIRY_LOOKAHEAD_DAYS
    ? Number(process.env.LICENSE_EXPIRY_LOOKAHEAD_DAYS)
    : 30;

  const dutyLookAheadMs = dueReminderDays * 24 * 60 * 60 * 1000;
  const licenseLookAheadMs = licenseExpiryDays * 24 * 60 * 60 * 1000;

  const dueAssessments = await prisma.dutyAssessment.findMany({
    where: {
      balanceAmount: { gt: 0 },
      status: {
        in: [
          DutyAssessmentStatus.CALCULATED,
          DutyAssessmentStatus.PART_PAID,
          DutyAssessmentStatus.OVERDUE,
        ],
      },
      dueDate: { lte: new Date(now.getTime() + dutyLookAheadMs) },
    },
    include: {
      license: { include: { holder: { select: { id: true, email: true, fullName: true, companyName: true } } } },
      batch: { select: { id: true, batchNo: true } },
    },
    take: 500,
  });

  for (const a of dueAssessments) {
    const holder = a.license?.holder;
    if (!holder?.id) continue;

    const overdue = a.dueDate && new Date(a.dueDate).getTime() < now.getTime();
    const title = overdue ? 'Duty payment overdue' : 'Duty payment due soon';
    const message = `Assessment ${a.assessmentNo} has a balance of LKR ${money(a.balanceAmount)} and is due on ${dayKey(a.dueDate)}.`;
    const dedupeKey = `DUTY:${a.id}:${dayKey(now)}`;
    const link = `/manufacturer/duties/${a.id}`;

    const n = await createNotification({
      userId: holder.id,
      type: overdue ? 'DUTY_OVERDUE' : 'DUTY_DUE',
      title,
      message,
      link,
      dedupeKey,
    });

    wsHub?.broadcastToUser(holder.id, { type: 'NOTIFICATION', data: n });

    if (holder.email) {
      await sendEmail({
        to: holder.email,
        subject: title,
        text: `${message}\n\nOpen: ${frontendBase ? `${frontendBase}${link}` : link}`,
      });
    }
  }

  
  const licenses = await prisma.license.findMany({
    where: {
      status: { in: [LicenseStatus.ACTIVE, LicenseStatus.SUSPENDED] },
      OR: [
        { effectiveTo: { lte: new Date(now.getTime() + licenseLookAheadMs) } },
        { renewalDueDate: { lte: new Date(now.getTime() + licenseLookAheadMs) } },
      ],
    },
    include: { holder: { select: { id: true, email: true, fullName: true, companyName: true } } },
    take: 500,
  });

  for (const l of licenses) {
    const holder = l.holder;
    if (!holder?.id) continue;

    const deadline = l.renewalDueDate || l.effectiveTo;
    if (!deadline) continue;

    const expired = new Date(deadline).getTime() < now.getTime();
    const title = expired ? 'License expired' : 'License expiring soon';
    const message = `License ${l.licenseNumber} (${l.type}) ${expired ? 'expired' : 'will expire'} on ${dayKey(deadline)}.`;
    const dedupeKey = `LIC:${l.id}:${dayKey(now)}`;
    const link = `/manufacturer/my-licenses`;

    const n = await createNotification({
      userId: holder.id,
      type: expired ? 'LICENSE_EXPIRED' : 'LICENSE_EXPIRING',
      title,
      message,
      link,
      dedupeKey,
    });

    wsHub?.broadcastToUser(holder.id, { type: 'NOTIFICATION', data: n });

    if (holder.email) {
      await sendEmail({
        to: holder.email,
        subject: title,
        text: `${message}\n\nOpen: ${frontendBase ? `${frontendBase}${link}` : link}`,
      });
    }
  }
}

module.exports = { runDueReminders };

