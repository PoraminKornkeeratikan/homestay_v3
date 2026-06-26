const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const EASYSLIP_API_KEY = Deno.env.get("EASYSLIP_API_KEY") || "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function moneyEqual(left: unknown, right: unknown) {
  return Math.round(Number(left || 0) * 100) === Math.round(Number(right || 0) * 100);
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D+/g, "");
}

function maskedAccountMatches(expected: unknown, actual: unknown) {
  const expectedDigits = onlyDigits(expected);
  const actualDigits = onlyDigits(actual);
  if (!expectedDigits || !actualDigits) return false;
  if (actualDigits.length <= 4) return expectedDigits.endsWith(actualDigits);
  return expectedDigits.endsWith(actualDigits.slice(-4))
    || actualDigits.endsWith(expectedDigits.slice(-4))
    || expectedDigits === actualDigits;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function supabaseRest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: serviceHeaders((options.headers || {}) as Record<string, string>)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.details || response.statusText || "Supabase request failed");
  }
  return data;
}

async function updateBooking(bookingId: string, patch: Record<string, unknown>) {
  return await supabaseRest(`bookings?id=eq.${encodeURIComponent(bookingId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch)
  });
}

async function createSignedSlipUrl(slipUrl: string) {
  if (isHttpUrl(slipUrl)) return slipUrl;

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/payment-slips/${slipUrl}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({ expiresIn: 60 * 10 })
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok || !data?.signedURL) {
    throw new Error(data?.message || data?.error || "สร้างลิงก์สลิปไม่สำเร็จ");
  }

  const signedPath = String(data.signedURL);
  return signedPath.startsWith("/storage/v1/")
    ? `${SUPABASE_URL}${signedPath}`
    : `${SUPABASE_URL}/storage/v1${signedPath}`;
}

async function loadSlipAsBase64(slipUrl: string) {
  const url = isHttpUrl(slipUrl)
    ? slipUrl
    : `${SUPABASE_URL}/storage/v1/object/payment-slips/${slipUrl}`;

  const response = await fetch(url, {
    headers: isHttpUrl(slipUrl) ? {} : serviceHeaders()
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "ดาวน์โหลดสลิปจาก Storage ไม่สำเร็จ");
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = await response.arrayBuffer();
  const maxSize = 4 * 1024 * 1024;

  if (buffer.byteLength > maxSize) {
    throw new Error("รูปสลิปใหญ่เกิน 4MB ตามข้อจำกัด EasySlip");
  }

  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
}

async function verifyWithEasySlip(slipBase64: string, expectedAmount: number, bookingCode: string) {
  const response = await fetch("https://api.easyslip.com/v2/verify/bank", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EASYSLIP_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      base64: slipBase64,
      remark: bookingCode,
      checkDuplicate: true,
      matchAccount: true,
      matchAmount: expectedAmount
    })
  });

  const data = await response.json().catch(() => null);
  return { ok: response.ok, data };
}

function buildDecision(booking: Record<string, unknown>, settings: Record<string, unknown>, easySlipData: Record<string, unknown>) {
  const data = (easySlipData.data || {}) as Record<string, unknown>;
  const rawSlip = (data.rawSlip || {}) as Record<string, unknown>;
  const amount = (rawSlip.amount || {}) as Record<string, unknown>;
  const receiver = (rawSlip.receiver || {}) as Record<string, unknown>;
  const receiverAccount = (receiver.account || {}) as Record<string, unknown>;
  const receiverBank = (receiverAccount.bank || {}) as Record<string, unknown>;
  const receiverName = (receiverAccount.name || {}) as Record<string, unknown>;
  const matchedAccount = data.matchedAccount as Record<string, unknown> | null;

  const expectedAmount = Number(booking.grand_total || 0);
  const amountInSlip = Number(data.amountInSlip || amount.amount || 0);
  const expectedReceiver = String(settings.bank_account_name || booking.bank_account_name || "");
  const expectedAccountNumber = String(settings.bank_account_number || booking.bank_account_number || "");
  const receiverNameTh = String(receiverName.th || "");
  const receiverNameEn = String(receiverName.en || "");
  const receiverAccountNumber = firstText(
    receiverAccount.account,
    receiverAccount.accountNumber,
    receiverAccount.no,
    receiverBank.account,
    receiverBank.accountNumber,
    matchedAccount?.account,
    matchedAccount?.accountNumber
  );
  const slipDateText = String(rawSlip.date || "");
  const slipDate = slipDateText ? new Date(slipDateText) : null;
  const createdAt = booking.created_at ? new Date(String(booking.created_at)) : null;
  const now = new Date();
  const issues: string[] = [];

  const amountMatched = typeof data.isAmountMatched === "boolean"
    ? data.isAmountMatched === true
    : moneyEqual(amountInSlip, expectedAmount);

  const expectedReceiverNormalized = normalizeText(expectedReceiver);
  const receiverMatchesSetting = expectedReceiverNormalized
    ? normalizeText(receiverNameTh).includes(expectedReceiverNormalized)
      || normalizeText(receiverNameEn).includes(expectedReceiverNormalized)
      || normalizeText(matchedAccount?.nameTh).includes(expectedReceiverNormalized)
      || normalizeText(matchedAccount?.nameEn).includes(expectedReceiverNormalized)
    : false;

  const accountNumberMatched = expectedAccountNumber
    ? maskedAccountMatches(expectedAccountNumber, receiverAccountNumber)
    : false;

  const checks = {
    accountNumber: {
      ok: accountNumberMatched,
      label: "เลขบัญชี",
      expected: expectedAccountNumber,
      actual: receiverAccountNumber || "-"
    },
    accountName: {
      ok: Boolean(expectedReceiverNormalized && (matchedAccount || receiverMatchesSetting)),
      label: "ชื่อบัญชี",
      expected: expectedReceiver,
      actual: receiverNameTh || receiverNameEn || String(matchedAccount?.nameTh || matchedAccount?.nameEn || "-")
    },
    transferTime: {
      ok: Boolean(slipDate && !Number.isNaN(slipDate.getTime())
        && slipDate.getTime() <= now.getTime() + 10 * 60 * 1000
        && (!createdAt || slipDate.getTime() >= createdAt.getTime() - 30 * 60 * 1000)),
      label: "เวลา",
      expected: createdAt?.toISOString() || "",
      actual: slipDateText || "-"
    },
    amount: {
      ok: amountMatched,
      label: "จำนวนเงิน",
      expected: expectedAmount,
      actual: amountInSlip
    },
    duplicate: {
      ok: data.isDuplicate !== true,
      label: "สลิปซ้ำ",
      expected: "ไม่ซ้ำ",
      actual: data.isDuplicate === true ? "ซ้ำ" : "ไม่ซ้ำ"
    }
  };

  if (!amountMatched) {
    issues.push(`ยอดเงินไม่ตรง ระบบต้องการ ${expectedAmount} แต่สลิปเป็น ${amountInSlip}`);
  }

  if (data.isDuplicate === true) {
    issues.push("สลิปนี้ถูกใช้ซ้ำ");
  }

  if (!expectedAccountNumber) {
    issues.push("ยังไม่ได้ตั้งเลขบัญชีรับเงินในระบบ");
  } else if (!accountNumberMatched) {
    issues.push("เลขบัญชีผู้รับไม่ตรง");
  }

  if (!expectedReceiverNormalized) {
    issues.push("ยังไม่ได้ตั้งชื่อบัญชีรับเงินในระบบ");
  } else if (!matchedAccount && !receiverMatchesSetting) {
    issues.push("ชื่อผู้รับไม่ตรงกับบัญชีรับเงิน");
  }

  if (!slipDate || Number.isNaN(slipDate.getTime())) {
    issues.push("ไม่พบวันที่และเวลาบนสลิป");
  } else {
    if (slipDate.getTime() > now.getTime() + 10 * 60 * 1000) {
      issues.push("เวลาบนสลิปอยู่ในอนาคต");
    }

    if (createdAt && slipDate.getTime() < createdAt.getTime() - 30 * 60 * 1000) {
      issues.push("เวลาบนสลิปเก่ากว่าเวลาที่ทำรายการจอง");
    }
  }

  const severeFailed = !checks.accountNumber.ok
    || !checks.accountName.ok
    || !checks.amount.ok
    || !checks.duplicate.ok;
  const reviewRequired = !severeFailed && !checks.transferTime.ok;

  return {
    passed: issues.length === 0,
    reviewRequired,
    autoCancelled: severeFailed,
    message: issues.length ? issues.join(" / ") : "วันที่ เวลา ชื่อผู้รับ และยอดเงินถูกต้อง",
    amountInSlip,
    transRef: String(rawSlip.transRef || ""),
    checks,
    rawSlip
  };
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase Edge Function ยังไม่มี SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!EASYSLIP_API_KEY) {
      throw new Error("ยังไม่ได้ตั้งค่า EASYSLIP_API_KEY ใน Supabase Secrets");
    }

    const body = await request.json().catch(() => ({}));
    const bookingId = String(body.bookingId || "").trim();
    const homestaySlug = String(body.homestaySlug || "").trim();

    if (!bookingId) {
      return jsonResponse({ ok: false, message: "ไม่พบ bookingId" }, 400);
    }

    const bookingRows = await supabaseRest(
      `bookings?id=eq.${encodeURIComponent(bookingId)}&select=*,homestays!inner(id,slug)`
    );
    const booking = bookingRows?.[0];

    if (!booking || (homestaySlug && booking.homestays?.slug !== homestaySlug)) {
      return jsonResponse({ ok: false, message: "ไม่พบรายการจองนี้" }, 404);
    }

    if (!booking.slip_url) {
      return jsonResponse({ ok: false, message: "รายการนี้ยังไม่มีสลิป" }, 400);
    }

    const settingRows = await supabaseRest(
      `homestay_settings?homestay_id=eq.${encodeURIComponent(String(booking.homestay_id))}&select=*`
    );
    const settings = settingRows?.[0] || {};

    const slipBase64 = await loadSlipAsBase64(String(booking.slip_url));
    const easySlipResult = await verifyWithEasySlip(
      slipBase64,
      Number(booking.grand_total || 0),
      String(booking.booking_code || booking.id)
    );

    if (!easySlipResult.ok || easySlipResult.data?.success === false) {
      const message = easySlipResult.data?.error?.message || "EasySlip ตรวจสลิปไม่สำเร็จ";
      await updateBooking(bookingId, {
        slip_verify_status: "error",
        slip_verify_message: message,
        slip_verified_at: new Date().toISOString(),
        slip_raw_result: easySlipResult.data
      });
      return jsonResponse({ ok: false, message }, 400);
    }

    const decision = buildDecision(booking, settings, easySlipResult.data);
    const patch: Record<string, unknown> = {
      slip_verify_status: decision.passed ? "passed" : "failed",
      slip_verify_message: decision.message,
      slip_verified_at: new Date().toISOString(),
      slip_transfer_amount: decision.amountInSlip,
      slip_transfer_ref: decision.transRef,
      slip_verify_checks: decision.checks,
      slip_raw_result: easySlipResult.data
    };

    if (decision.passed) {
      patch.payment_status = "ชำระแล้ว";
      patch.status = "ชำระแล้ว";
    } else if (decision.reviewRequired) {
      patch.payment_status = "รอตรวจสอบสลิป";
      patch.status = "รอตรวจสอบสลิป";
    } else if (decision.autoCancelled) {
      patch.payment_status = "ยกเลิก";
      patch.status = "ยกเลิก";
    }

    const updatedRows = await updateBooking(bookingId, patch);

    return jsonResponse({
      ok: true,
      data: {
        passed: decision.passed,
        message: decision.message,
        booking: updatedRows?.[0] || null
      }
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error instanceof Error ? error.message : "ตรวจสลิปไม่สำเร็จ"
    }, 500);
  }
});
