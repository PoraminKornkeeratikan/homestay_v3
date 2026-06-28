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
    .replace(/^(นาย|นางสาว|นาง|น\.ส\.|คุณ|mr|mrs|ms|miss)\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function nameMatches(expected: unknown, actual: unknown) {
  const expectedText = normalizeText(expected);
  const actualText = normalizeText(actual);
  if (!expectedText || !actualText) return false;
  if (expectedText === actualText) return true;
  if (actualText.length >= 4 && expectedText.includes(actualText)) return true;
  if (expectedText.length >= 4 && actualText.includes(expectedText)) return true;

  return false;
}

function moneyEqual(left: unknown, right: unknown) {
  return Math.round(Number(left || 0) * 100) === Math.round(Number(right || 0) * 100);
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D+/g, "");
}

function promptPayCandidates(value: unknown) {
  const digits = onlyDigits(value);
  if (!digits) return [];

  const candidates = new Set([digits]);
  if (digits.length === 10 && digits.startsWith("0")) {
    candidates.add(`66${digits.slice(1)}`);
    candidates.add(`0066${digits.slice(1)}`);
  }
  if (digits.length === 11 && digits.startsWith("66")) {
    candidates.add(`0${digits.slice(2)}`);
    candidates.add(`00${digits}`);
  }
  if (digits.length === 13 && digits.startsWith("0066")) {
    candidates.add(`0${digits.slice(4)}`);
    candidates.add(digits.slice(2));
  }

  return Array.from(candidates);
}

function maskedAccountMatches(expected: unknown, actual: unknown) {
  const expectedDigits = onlyDigits(expected);
  const actualDigits = onlyDigits(actual);
  if (!expectedDigits || !actualDigits) return false;
  if (actualDigits.length < 4 || expectedDigits.length < 4) return expectedDigits === actualDigits;
  if (actualDigits.length <= 4) return expectedDigits.endsWith(actualDigits);
  return expectedDigits.endsWith(actualDigits.slice(-4))
    || actualDigits.endsWith(expectedDigits.slice(-4))
    || expectedDigits === actualDigits;
}

function promptPayMatches(expected: unknown, actual: unknown) {
  const expectedCandidates = promptPayCandidates(expected);
  const actualDigits = onlyDigits(actual);
  if (!expectedCandidates.length || !actualDigits) return false;

  return expectedCandidates.some(candidate => maskedAccountMatches(candidate, actualDigits));
}

function collectDigitTexts(value: unknown, found: string[] = []) {
  if (value === null || value === undefined) return found;

  if (typeof value === "string" || typeof value === "number") {
    const digits = onlyDigits(value);
    if (digits) found.push(digits);
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectDigitTexts(item, found));
    return found;
  }

  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(item => collectDigitTexts(item, found));
  }

  return found;
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

async function getHomestayBySlug(slug: string) {
  const rows = await supabaseRest(
    `homestays?slug=eq.${encodeURIComponent(slug)}&select=id,slug&limit=1`
  );
  return rows?.[0] || null;
}

async function getSettingsByHomestayId(homestayId: string) {
  const rows = await supabaseRest(
    `homestay_settings?homestay_id=eq.${encodeURIComponent(homestayId)}&select=*`
  );
  return rows?.[0] || {};
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
  if (contentType.toLowerCase().includes("pdf")) {
    throw new Error("EasySlip ยังไม่รองรับการตรวจสลิปแบบ PDF กรุณาอัปโหลดเป็นรูปภาพ");
  }

  const buffer = await response.arrayBuffer();
  const maxSize = 4 * 1024 * 1024;
  if (buffer.byteLength > maxSize) {
    throw new Error("รูปสลิปใหญ่เกิน 4MB ตามข้อจำกัดของ EasySlip");
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

function buildDecision(
  booking: Record<string, unknown>,
  settings: Record<string, unknown>,
  easySlipData: Record<string, unknown>
) {
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
  const expectedPromptPay = String(settings.promptpay_id || booking.promptpay_id || "");
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
    ? nameMatches(expectedReceiver, receiverNameTh)
      || nameMatches(expectedReceiver, receiverNameEn)
      || nameMatches(expectedReceiver, matchedAccount?.nameTh)
      || nameMatches(expectedReceiver, matchedAccount?.nameEn)
    : false;

  const receiverIdentifiers = Array.from(new Set([
    receiverAccountNumber,
    ...collectDigitTexts(receiver),
    ...collectDigitTexts(matchedAccount)
  ].filter(Boolean)));
  const accountNumberMatched = expectedAccountNumber
    ? receiverIdentifiers.some(identifier => maskedAccountMatches(expectedAccountNumber, identifier))
    : false;
  const promptPayMatched = expectedPromptPay
    ? receiverIdentifiers.some(identifier => promptPayMatches(expectedPromptPay, identifier))
    : false;
  const payoutIdentifierMatched = accountNumberMatched || promptPayMatched;
  const payoutExpected = [
    expectedAccountNumber ? `บัญชี ${expectedAccountNumber}` : "",
    expectedPromptPay ? `พร้อมเพย์ ${expectedPromptPay}` : ""
  ].filter(Boolean).join(" หรือ ");
  const accountNameMatched = Boolean(
    expectedReceiverNormalized
    && (matchedAccount || receiverMatchesSetting)
  );

  const checks = {
    accountNumber: {
      ok: payoutIdentifierMatched,
      label: "เลขบัญชี/พร้อมเพย์",
      expected: payoutExpected,
      actual: receiverIdentifiers.join(", ") || "-"
    },
    accountName: {
      ok: accountNameMatched,
      label: "ชื่อบัญชี",
      expected: expectedReceiver,
      actual: receiverNameTh || receiverNameEn || String(matchedAccount?.nameTh || matchedAccount?.nameEn || "-")
    },
    transferTime: {
      ok: Boolean(
        slipDate
        && !Number.isNaN(slipDate.getTime())
        && slipDate.getTime() <= now.getTime() + 10 * 60 * 1000
        && (!createdAt || slipDate.getTime() >= createdAt.getTime() - 30 * 60 * 1000)
      ),
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

  if (!expectedAccountNumber && !expectedPromptPay) {
    issues.push("ยังไม่ได้ตั้งเลขบัญชีหรือเลขพร้อมเพย์รับเงินในระบบ");
  } else if (!payoutIdentifierMatched) {
    issues.push("เลขบัญชีหรือเลขพร้อมเพย์ผู้รับไม่ตรง");
  }

  if (!expectedReceiverNormalized) {
    issues.push("ยังไม่ได้ตั้งชื่อบัญชีรับเงินในระบบ");
  } else if (!accountNameMatched) {
    issues.push("ชื่อผู้รับไม่ตรงกับบัญชีรับเงิน");
  }

  if (!slipDate || Number.isNaN(slipDate.getTime())) {
    issues.push("ไม่พบวันและเวลาบนสลิป");
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
    autoCancelled: false,
    message: issues.length
      ? issues.join(" / ")
      : "ตรวจสลิปผ่าน",
    amountInSlip,
    transRef: String(rawSlip.transRef || ""),
    checks,
    rawSlip
  };
}

function buildPatchFromDecision(decision: ReturnType<typeof buildDecision>, easySlipData: Record<string, unknown>) {
  const patch: Record<string, unknown> = {
    slip_verify_status: decision.passed ? "passed" : "failed",
    slip_verify_message: decision.message,
    slip_verified_at: new Date().toISOString(),
    slip_transfer_amount: decision.amountInSlip,
    slip_transfer_ref: decision.transRef,
    slip_verify_checks: decision.checks,
    slip_raw_result: easySlipData
  };

  if (decision.passed) {
    patch.payment_status = "ชำระแล้ว";
    patch.status = "ชำระแล้ว";
  } else {
    patch.payment_status = "รอตรวจสอบสลิป";
    patch.status = "รอยืนยัน";
  }

  return patch;
}

function buildClientDataFromDecision(decision: ReturnType<typeof buildDecision>, easySlipData: Record<string, unknown>) {
  const patch = buildPatchFromDecision(decision, easySlipData);

  return {
    passed: decision.passed,
    message: decision.message,
    slipVerifyStatus: patch.slip_verify_status,
    slipVerifyMessage: patch.slip_verify_message,
    slipVerifiedAt: patch.slip_verified_at,
    slipTransferAmount: patch.slip_transfer_amount,
    slipTransferRef: patch.slip_transfer_ref,
    slipVerifyChecks: patch.slip_verify_checks,
    slipRawResult: patch.slip_raw_result,
    paymentStatus: patch.payment_status || "รอตรวจสอบสลิป",
    status: patch.status || "รอตรวจสอบสลิป"
  };
}

async function handleInlinePrecheck(body: Record<string, unknown>) {
  const homestaySlug = String(body.homestaySlug || "").trim();
  const slipBase64 = String(body.slipBase64 || "").trim();
  const booking = body.booking as Record<string, unknown>;

  const homestay = await getHomestayBySlug(homestaySlug);
  if (!homestay?.id) {
    return jsonResponse({ ok: false, message: "ไม่พบโฮมสเตย์นี้" }, 404);
  }

  const settings = await getSettingsByHomestayId(String(homestay.id));
  const bookingForCheck = {
    booking_code: String(booking.bookingCode || "").trim(),
    grand_total: Number(booking.grandTotal || 0),
    bank_account_name: String(booking.bankAccountName || ""),
    bank_account_number: String(booking.bankAccountNumber || ""),
    promptpay_id: String(booking.promptpayId || booking.promptPayId || ""),
    created_at: new Date().toISOString()
  };

  const easySlipResult = await verifyWithEasySlip(
    slipBase64,
    Number(bookingForCheck.grand_total || 0),
    String(bookingForCheck.booking_code || "pending-booking")
  );

  if (!easySlipResult.ok || easySlipResult.data?.success === false) {
    const message = easySlipResult.data?.error?.message || "EasySlip ตรวจสลิปไม่สำเร็จ";
    return jsonResponse({ ok: false, message, data: easySlipResult.data || null }, 400);
  }

  const decision = buildDecision(bookingForCheck, settings, easySlipResult.data);
  return jsonResponse({
    ok: true,
    data: buildClientDataFromDecision(decision, easySlipResult.data)
  });
}


async function deductCreditsForBooking(homestayId: string, bookingId: string) {
  const [planRows, settingsRows] = await Promise.all([
    supabaseRest(`homestay_plans?homestay_id=eq.${encodeURIComponent(homestayId)}&select=*`),
    supabaseRest(`homestay_settings?homestay_id=eq.${encodeURIComponent(homestayId)}&select=credit_per_booking`)
  ]);
  const plan = planRows?.[0];
  if (!plan || plan.plan_type !== "credit") return; // yearly/infinity ไม่ตัด

  const creditPerBooking = Number(settingsRows?.[0]?.credit_per_booking || 40);
  const nextCredits = Math.max(0, Number(plan.credits || 0) - creditPerBooking);

  await supabaseRest(`homestay_plans?homestay_id=eq.${encodeURIComponent(homestayId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ credits: nextCredits })
  });

  await supabaseRest("credit_ledger", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      homestay_id: homestayId,
      booking_id: bookingId,
      amount: -creditPerBooking,
      reason: "booking_auto_confirmed"
    })
  });
}

async function handleStoredBookingVerification(bookingId: string, homestaySlug: string) {
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

  const settings = await getSettingsByHomestayId(String(booking.homestay_id));
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
  const patch = buildPatchFromDecision(decision, easySlipResult.data);
  const updatedRows = await updateBooking(bookingId, patch);

  // สลิปผ่านทุกอย่าง → ตัดเครดิตอัตโนมัติ
  if (decision.passed) {
    await deductCreditsForBooking(String(booking.homestay_id), bookingId).catch(err => {
      console.error("deductCreditsForBooking failed:", err);
    });
  }

  return jsonResponse({
    ok: true,
    data: {
      passed: decision.passed,
      reviewRequired: decision.reviewRequired,
      message: decision.message,
      booking: updatedRows?.[0] || null
    }
  });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase Edge Function ยังไม่ได้ตั้ง SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!EASYSLIP_API_KEY) {
      throw new Error("ยังไม่ได้ตั้งค่า EASYSLIP_API_KEY ใน Supabase Secrets");
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const bookingId = String(body.bookingId || "").trim();
    const homestaySlug = String(body.homestaySlug || "").trim();
    const hasInlinePayload = Boolean(
      homestaySlug
      && String(body.slipBase64 || "").trim()
      && body.booking
      && typeof body.booking === "object"
    );

    if (hasInlinePayload && !bookingId) {
      return await handleInlinePrecheck(body);
    }

    if (!bookingId) {
      return jsonResponse({ ok: false, message: "ไม่พบ bookingId" }, 400);
    }

    return await handleStoredBookingVerification(bookingId, homestaySlug);
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error instanceof Error ? error.message : "ตรวจสลิปไม่สำเร็จ"
    }, 500);
  }
});