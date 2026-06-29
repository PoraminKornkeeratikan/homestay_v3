const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const BOOKING_EMAIL_FROM = Deno.env.get("BOOKING_EMAIL_FROM") || "";
const BOOKING_EMAIL_REPLY_TO = Deno.env.get("BOOKING_EMAIL_REPLY_TO") || "";

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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: unknown) {
  return `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function dateText(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function normalizeAddonItems(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function addonText(booking: Record<string, unknown>) {
  const items = normalizeAddonItems(booking.addonItems || booking.addon_items)
    .filter(item => Number(item?.qty || 0) > 0 || Number(item?.total || 0) > 0)
    .map(item => {
      const qty = Number(item?.qty || 0);
      const name = text(item?.name, "บริการเสริม");
      const total = Number(item?.total || 0) || qty * Number(item?.price || 0);
      return `${name}${qty ? ` x ${qty}` : ""} (${money(total)})`;
    });

  return items.length ? items.join(", ") : "ไม่มี";
}

function bookingRows(booking: Record<string, unknown>, homestay: Record<string, unknown>) {
  return [
    ["โฮมสเตย์", text(homestay.name || homestay.slug, "Homestay")],
    ["เลขรายการจอง", text(booking.bookingCode || booking.booking_code || booking.id)],
    ["ชื่อผู้จอง", text(booking.name || booking.guest_name)],
    ["เบอร์โทร", text(booking.phone || booking.guest_phone)],
    ["ห้องพัก", text(booking.roomName || booking.room_name)],
    ["เช็กอิน", dateText(booking.checkIn || booking.check_in)],
    ["เช็กเอาต์", dateText(booking.checkOut || booking.check_out)],
    ["จำนวนคืน", `${Number(booking.nights || 0)} คืน`],
    ["ผู้เข้าพัก", `${Number(booking.guestCount || booking.guest_count || 1)} คน`],
    ["บริการเสริม", addonText(booking)],
    ["ค่าห้อง", money(booking.roomTotal || booking.room_total)],
    ["ค่าบริการเสริม", money(booking.addonTotal || booking.addon_total)],
    ["ค่าจอง", money(booking.bookingFee || booking.booking_fee)],
    ["ยอดชำระ", money(booking.grandTotal || booking.grand_total || booking.total)],
    ["สถานะ", text(booking.status, "รอยืนยัน")],
    ["การชำระเงิน", text(booking.paymentStatus || booking.payment_status, "รอตรวจสอบ")]
  ];
}

function buildTextEmail(booking: Record<string, unknown>, homestay: Record<string, unknown>) {
  const rows = bookingRows(booking, homestay)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  return [
    "ยืนยันการรับคำจองที่พัก",
    "",
    rows,
    "",
    "หมายเหตุ: ระบบได้รับคำจองแล้ว เจ้าของที่พักจะตรวจสอบข้อมูลและยืนยันสถานะอีกครั้ง"
  ].join("\n");
}

function buildHtmlEmail(booking: Record<string, unknown>, homestay: Record<string, unknown>) {
  const rows = bookingRows(booking, homestay)
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 12px;color:#5f756d;border-bottom:1px solid #e5efe9;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;color:#163d2f;font-weight:700;border-bottom:1px solid #e5efe9;">${escapeHtml(value)}</td>
      </tr>
    `).join("");

  return `
    <div style="margin:0;padding:24px;background:#f4fbf7;font-family:Arial,'Noto Sans Thai',sans-serif;color:#1d2b25;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dcebe3;border-radius:18px;overflow:hidden;">
        <div style="padding:22px 24px;background:#14533f;color:#ffffff;">
          <div style="font-size:14px;opacity:.86;">ยืนยันการรับคำจองที่พัก</div>
          <h1 style="margin:8px 0 0;font-size:24px;">${escapeHtml(text(homestay.name || homestay.slug, "Homestay"))}</h1>
        </div>
        <div style="padding:22px 24px;">
          <p style="margin:0 0 16px;line-height:1.7;">ระบบได้รับคำจองของคุณแล้ว กรุณาเก็บเลขรายการจองไว้สำหรับตรวจสอบสถานะ</p>
          <table style="width:100%;border-collapse:collapse;background:#fbfefc;border:1px solid #e5efe9;border-radius:12px;overflow:hidden;">
            ${rows}
          </table>
          <p style="margin:18px 0 0;color:#6b7280;line-height:1.7;font-size:14px;">หมายเหตุ: เจ้าของที่พักจะตรวจสอบข้อมูลและยืนยันสถานะอีกครั้ง</p>
        </div>
      </div>
    </div>
  `;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
    }
    if (!RESEND_API_KEY || !BOOKING_EMAIL_FROM) {
      return jsonResponse({
        ok: false,
        message: "Missing RESEND_API_KEY or BOOKING_EMAIL_FROM"
      }, 200);
    }

    const payload = await req.json().catch(() => ({}));
    const booking = (payload.booking || {}) as Record<string, unknown>;
    const homestay = (payload.homestay || {}) as Record<string, unknown>;
    const to = text(booking.email || booking.guest_email, "");

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return jsonResponse({ ok: false, message: "Missing customer email" }, 200);
    }

    const bookingCode = text(booking.bookingCode || booking.booking_code || booking.id);
    const subject = `ยืนยันการจองที่พัก ${bookingCode}`;
    const body: Record<string, unknown> = {
      from: BOOKING_EMAIL_FROM,
      to: [to],
      subject,
      text: buildTextEmail(booking, homestay),
      html: buildHtmlEmail(booking, homestay)
    };

    if (BOOKING_EMAIL_REPLY_TO) body.reply_to = BOOKING_EMAIL_REPLY_TO;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let data: unknown = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      return jsonResponse({
        ok: false,
        message: "Send booking email failed",
        details: data
      }, 200);
    }

    return jsonResponse({ ok: true, data });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
