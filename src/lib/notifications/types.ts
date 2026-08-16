// ==========================================
// واجهة قنوات الإشعارات - قابلة للاستبدال
// ==========================================

export interface NotificationMessage {
  to: string;
  subject?: string;
  body: string;
  html?: string;
}

export interface NotificationChannel {
  readonly name: string;
  send(message: NotificationMessage): Promise<{ ok: boolean; error?: string }>;
}
