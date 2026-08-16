import type { NotificationChannel, NotificationMessage } from "./types";

/** قناة وهمية تسجّل الرسائل في اللوق بدل الإرسال الفعلي */
export class MockChannel implements NotificationChannel {
  constructor(readonly name: string) {}

  async send(message: NotificationMessage) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[notify:${this.name}] → ${message.to}: ${message.subject ?? ""} ${message.body}`
      );
    }
    return { ok: true };
  }
}
