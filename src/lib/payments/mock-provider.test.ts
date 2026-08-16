import { describe, it, expect } from "vitest";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";

describe("MockPaymentProvider", () => {
  const provider = new MockPaymentProvider();

  it("ينشئ دفعة بحالة مدفوع", async () => {
    const result = await provider.createPayment({
      orderId: "o1",
      orderNumber: "AB-123",
      amount: 100,
      currency: "TRY",
      customerEmail: "a@b.com",
      idempotencyKey: "key-1",
      returnUrl: "http://localhost/return",
    });
    expect(result.status).toBe("paid");
    expect(result.providerRef).toContain("key-1");
  });

  it("يتحقق من webhook صالح", async () => {
    const body = JSON.stringify({
      id: "evt_1",
      type: "payment.succeeded",
      providerRef: "mock_key-1",
      status: "paid",
    });
    const result = await provider.verifyWebhook(body, null);
    expect(result.valid).toBe(true);
    expect(result.eventId).toBe("evt_1");
  });

  it("يرفض webhook غير صالح", async () => {
    const result = await provider.verifyWebhook("not-json", null);
    expect(result.valid).toBe(false);
  });
});
