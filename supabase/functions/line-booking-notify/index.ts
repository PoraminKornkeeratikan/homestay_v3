const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
const LINE_TO_ID = Deno.env.get("LINE_TO_ID") || "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function text(value: unknown, fallback = "-") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function money(value: unknown) {
  return `฿${Number(value || 0).toLocaleString("th-TH")}`;
}

function dateText(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function getSlipImageUrl(booking: Record<string, unknown>) {
  const slipUrl = text(booking.slipUrl || booking.slip_url, "");
  if (!/^https:\/\//i.test(slipUrl)) return "";
  return slipUrl;
}

function checkIcon(check: unknown) {
  return (check as Record<string, unknown> | undefined)?.ok === true ? "✅" : "❌";
}

function hasCheck(checks: Record<string, unknown>, key: string) {
  return Boolean(checks && typeof checks === "object" && checks[key]);
}

function buildSlipCheckMessage(booking: Record<string, unknown>) {
  const status = text(booking.slipVerifyStatus || booking.slip_verify_status, "not_checked");
  const checks = (booking.slipVerifyChecks || booking.slip_verify_checks || {}) as Record<string, unknown>;

  if (status === "not_checked" || !Object.keys(checks).length) {
    return "ผลตรวจสลิป: รอตรวจสอบ";
  }

  if (status === "error") {
    const message = text(booking.slipVerifyMessage || booking.slip_verify_message, "");
    return ["ผลตรวจสลิป: ตรวจไม่ได้", message].filter(Boolean).join("\n");
  }

  const lines = [
    "ผลตรวจสลิป",
    hasCheck(checks, "accountNumber") ? `เลขบัญชี/พร้อมเพย์ ${checkIcon(checks.accountNumber)}` : "",
    hasCheck(checks, "accountName") ? `ชื่อบัญชี ${checkIcon(checks.accountName)}` : "",
    hasCheck(checks, "transferTime") ? `เวลา ${checkIcon(checks.transferTime)}` : "",
    hasCheck(checks, "amount") ? `จำนวนเงิน ${checkIcon(checks.amount)}` : ""
  ];

  const duplicate = checks.duplicate as Record<string, unknown> | undefined;
  if (duplicate?.ok === false) {
    lines.push(`สลิปซ้ำ ${checkIcon(duplicate)}`);
  }

  return lines.filter(Boolean).join("\n");
}

function buildBookingMessage(booking: Record<string, unknown>, homestay: Record<string, unknown>) {
  const homestayName = text(homestay.name || homestay.slug, "Homestay");
  const code = text(booking.bookingCode || booking.booking_code || booking.id);
  const guest = text(booking.name || booking.guest_name);
  const phone = text(booking.phone || booking.guest_phone);
  const room = text(booking.roomName || booking.room_name);
  const checkIn = dateText(booking.checkIn || booking.check_in);
  const checkOut = dateText(booking.checkOut || booking.check_out);
  const total = money(booking.grandTotal || booking.grand_total || booking.total);
  const payment = text(booking.paymentStatus || booking.payment_status, "รอตรวจสอบ");
  const status = text(booking.status, "รอยืนยัน");
  const note = text(booking.note, "");

  return [
    "มีรายการจองใหม่",
    `โฮมสเตย์: ${homestayName}`,
    `รหัสจอง: ${code}`,
    `ผู้จอง: ${guest}`,
    `โทร: ${phone}`,
    `ห้อง: ${room}`,
    `เข้าพัก: ${checkIn} - ${checkOut}`,
    `ยอดรวม: ${total}`,
    `ชำระเงิน: ${payment}`,
    `สถานะ: ${status}`,
    buildSlipCheckMessage(booking),
    note ? `หมายเหตุ: ${note}` : ""
  ].filter(Boolean).join("\n");
}

function buildTopupMessage(topup: Record<string, unknown>) {
  const homestayName = text(topup.homestayName || topup.siteName || topup.homestaySlug, "Homestay");
  const type = text(topup.type, "credit") === "yearly" ? "รายปี" : `${Number(topup.credits || 0).toLocaleString("th-TH")} เครดิต`;
  const status = text(topup.status, "-");
  const verified = text(topup.slipVerifyStatus || topup.verifyStatus, "-");
  const message = text(topup.slipVerifyMessage || topup.verifyMessage, "");

  return [
    "คำขอเติมเครดิต",
    `สถานะ: ${status}`,
    `ผลตรวจสลิป: ${verified}`,
    `โฮมสเตย์: ${homestayName}`,
    `รายการ: ${text(topup.label)} (${type})`,
    `ยอดชำระ: ${money(topup.price)}`,
    `รหัสคำขอ: ${text(topup.id)}`,
    topup.approvedAt ? `อนุมัติ: ${dateText(topup.approvedAt)}` : "",
    topup.doneAt ? `สำเร็จ: ${dateText(topup.doneAt)}` : "",
    message ? `หมายเหตุ: ${message}` : ""
  ].filter(Boolean).join("\n");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
    }

    const payload = await req.json().catch(() => ({}));
    const topupRequest = (payload.topupRequest || {}) as Record<string, unknown>;
    if (topupRequest && Object.keys(topupRequest).length) {
      const targetLineId = text(topupRequest.lineToId || payload.lineToId || LINE_TO_ID, "");

      if (!LINE_CHANNEL_ACCESS_TOKEN || !targetLineId) {
        return jsonResponse({
          ok: false,
          message: "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_TO_ID"
        }, 200);
      }

      const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: targetLineId,
          messages: [{ type: "text", text: buildTopupMessage(topupRequest) }]
        })
      });

      const lineText = await lineResponse.text();
      let lineData: unknown = null;
      try {
        lineData = lineText ? JSON.parse(lineText) : null;
      } catch {
        lineData = lineText;
      }

      if (!lineResponse.ok) {
        return jsonResponse({
          ok: false,
          message: "ส่งแจ้งเตือน LINE ไม่สำเร็จ",
          details: lineData
        }, 200);
      }

      return jsonResponse({ ok: true, message: "ส่งแจ้งเตือน LINE แล้ว" });
    }

    const booking = (payload.booking || {}) as Record<string, unknown>;
    const homestay = (payload.homestay || {}) as Record<string, unknown>;
    const targetLineId = text(homestay.lineToId || homestay.line_to_id || LINE_TO_ID, "");

    if (!LINE_CHANNEL_ACCESS_TOKEN || !targetLineId) {
      return jsonResponse({
        ok: false,
        message: "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_TO_ID ของโฮมสเตย์นี้"
      }, 200);
    }

    const message = buildBookingMessage(booking, homestay);
    const slipImageUrl = getSlipImageUrl(booking);
    const messages: Record<string, unknown>[] = [{ type: "text", text: message }];

    if (slipImageUrl) {
      messages.push({
        type: "image",
        originalContentUrl: slipImageUrl,
        previewImageUrl: slipImageUrl
      });
    }

    const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: targetLineId,
        messages
      })
    });

    const lineText = await lineResponse.text();
    let lineData: unknown = null;
    try {
      lineData = lineText ? JSON.parse(lineText) : null;
    } catch {
      lineData = lineText;
    }

    if (!lineResponse.ok) {
      return jsonResponse({
        ok: false,
        message: "ส่งแจ้งเตือน LINE ไม่สำเร็จ",
        details: lineData
      }, 200);
    }

    return jsonResponse({ ok: true, message: "ส่งแจ้งเตือน LINE แล้ว" });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
