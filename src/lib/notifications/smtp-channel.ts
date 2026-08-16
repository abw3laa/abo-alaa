import type { NotificationChannel, NotificationMessage } from "./types";

/**
 * قناة البريد عبر SMTP (هيكل جاهز للربط).
 * للتفعيل: npm i nodemailer وضبط SMTP_* في البيئة،
 * ثم أزل التعليقات.
 */
export class SmtpChannel implements NotificationChannel {
  readonly name = "email";

  async send(message: NotificationMessage) {
    const host = process.env.SMTP_HOST;
    if (!host) {
      return { ok: false, error: "SMTP غير مضبوط" };
    }
    // للتفعيل: ثبّت nodemailer وأزل التعليقات، مستخدماً message.to/subject/body/html
    void message;
    // import nodemailer from "nodemailer";
    // const transport = nodemailer.createTransport({
    //   host,
    //   port: Number(process.env.SMTP_PORT ?? 587),
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASSWORD,
    //   },
    // });
    // await transport.sendMail({
    //   from: process.env.EMAIL_FROM,
    //   to: message.to,
    //   subject: message.subject,
    //   text: message.body,
    //   html: message.html,
    // });
    // return { ok: true };
    return { ok: false, error: "SMTP غير مُفعّل بعد" };
  }
}
