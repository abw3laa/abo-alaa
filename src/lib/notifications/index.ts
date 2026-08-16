import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import type { NotificationChannel } from "./types";
import { MockChannel } from "./mock-channel";
import { SmtpChannel } from "./smtp-channel";

function getEmailChannel(): NotificationChannel {
  const provider = (process.env.EMAIL_PROVIDER ?? "mock").toLowerCase();
  return provider === "smtp" ? new SmtpChannel() : new MockChannel("email");
}

function getSmsChannel(): NotificationChannel {
  return new MockChannel("sms");
}

function getWhatsappChannel(): NotificationChannel {
  return new MockChannel("whatsapp");
}

/** إنشاء إشعار داخلي مرتبط بالمستخدم */
export async function createInAppNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      },
    });
  } catch {
    // لا نُفشل العملية الأساسية
  }
}

/** إرسال إشعار عبر البريد (وقنوات أخرى عند التفعيل) */
export async function sendEmailNotification(params: {
  to: string;
  subject: string;
  body: string;
  html?: string;
}) {
  const channel = getEmailChannel();
  return channel.send({
    to: params.to,
    subject: params.subject,
    body: params.body,
    html: params.html,
  });
}

/** إشعار تأكيد الطلب عبر كل القنوات المناسبة */
export async function notifyOrderConfirmed(params: {
  userId?: string | null;
  email: string;
  phone?: string | null;
  orderNumber: string;
}) {
  const subject = `تأكيد طلبك ${params.orderNumber}`;
  const body = `شكراً لك! تم استلام طلبك رقم ${params.orderNumber} وسنبدأ بتجهيزه.`;

  await sendEmailNotification({ to: params.email, subject, body });

  if (params.phone) {
    await getSmsChannel().send({ to: params.phone, body });
    await getWhatsappChannel().send({ to: params.phone, body });
  }

  if (params.userId) {
    await createInAppNotification({
      userId: params.userId,
      type: "ORDER_CONFIRMED",
      title: subject,
      message: body,
      link: "/account/orders",
    });
  }
}
