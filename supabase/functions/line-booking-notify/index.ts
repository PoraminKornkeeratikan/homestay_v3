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
    note ? `หมายเหตุ: ${note}` : ""
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

    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_TO_ID) {
      return jsonResponse({
        ok: false,
        message: "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_TO_ID ใน Supabase Secrets"
      }, 200);
    }

    const payload = await req.json().catch(() => ({}));
    const booking = (payload.booking || {}) as Record<string, unknown>;
    const homestay = (payload.homestay || {}) as Record<string, unknown>;
    const message = buildBookingMessage(booking, homestay);

    const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: LINE_TO_ID,
        messages: [{ type: "text", text: message }]
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
