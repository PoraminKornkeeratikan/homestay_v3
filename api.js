const LOCAL_BOOKING_KEY = "greenstay_bookings_backup_v3";
const LOCAL_ROOMS_KEY = "greenstay_rooms_backup_v3";
const LOCAL_SETTINGS_KEY = "greenstay_settings_backup_v3";
const LOCAL_HOMESTAY_PASSWORDS_KEY = "greenstay_homestay_passwords_v3";
const isGoogleSheetReady = GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/");
const isSupabaseReady = typeof SUPABASE_URL !== "undefined"
  && typeof SUPABASE_ANON_KEY !== "undefined"
  && /^https:\/\/.+\.supabase\.co\/?$/.test(String(SUPABASE_URL || "").trim())
  && String(SUPABASE_ANON_KEY || "").trim().length > 20;

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function formatMoney(number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(Number(number || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localGetBookings() {
  return JSON.parse(localStorage.getItem(LOCAL_BOOKING_KEY) || "[]");
}

function localSaveBookings(bookings) {
  localStorage.setItem(LOCAL_BOOKING_KEY, JSON.stringify(bookings));
}

function localGetRooms() {
  return JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || JSON.stringify(DEFAULT_ROOMS));
}

function localSaveRooms(rooms) {
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
}

function localGetSettings() {
  return {
    ...clone(DEFAULT_SETTINGS),
    ...JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || "{}")
  };
}

function localSaveSettings(settings) {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

function getDefaultOwnerPassword() {
  return String(typeof OWNER_PASSWORD !== "undefined" ? OWNER_PASSWORD : "1234");
}

function normalizeOwnerPassword(value) {
  const password = String(value || "").trim();
  return password || getDefaultOwnerPassword();
}

function localGetHomestayPasswords() {
  return JSON.parse(localStorage.getItem(LOCAL_HOMESTAY_PASSWORDS_KEY) || "{}");
}

function localSaveHomestayPassword(slug, password) {
  const passwords = localGetHomestayPasswords();
  passwords[normalizeHomestaySlug(slug || getCurrentHomestaySlug())] = normalizeOwnerPassword(password);
  localStorage.setItem(LOCAL_HOMESTAY_PASSWORDS_KEY, JSON.stringify(passwords));
}

function localGetHomestayPassword(slug) {
  const passwords = localGetHomestayPasswords();
  return passwords[normalizeHomestaySlug(slug || getCurrentHomestaySlug())] || getDefaultOwnerPassword();
}

function getCurrentHomestaySlug() {
  const params = new URLSearchParams(window.location.search);
  return String(
    params.get("homestay")
    || params.get("slug")
    || params.get("h")
    || (typeof DEFAULT_HOMESTAY_SLUG !== "undefined" ? DEFAULT_HOMESTAY_SLUG : "Wiwahrin")
  ).trim();
}

function normalizeHomestaySlug(value, fallback = "homestay") {
  const slug = String(value || fallback || "homestay")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `homestay-${Date.now()}`;
}

function isSchemaColumnError(error) {
  return /schema cache|column|Could not find|does not exist/i.test(String(error?.message || ""));
}

function isDuplicateRowError(error) {
  return /duplicate|unique|already exists/i.test(String(error?.message || ""));
}

function supabaseBaseUrl() {
  return String(SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

async function supabaseRequest(path, options = {}) {
  const url = `${supabaseBaseUrl()}/rest/v1/${path}`;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.details || response.statusText || "Supabase request failed";
    throw new Error(message);
  }

  return data;
}

async function supabaseFunctionRequest(functionName, payload = {}) {
  const url = `${supabaseBaseUrl()}/functions/v1/${functionName}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error?.message || response.statusText || "Function request failed");
  }

  return data;
}

function normalizeAddonItems(items = [], fallbackSettings = {}) {
  const source = Array.isArray(items) ? items : [];
  const normalized = source
    .map((item, index) => {
      const name = String(item?.name || item?.label || "").trim();
      const id = String(item?.id || name || `addon_${index + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^\w-]+/g, "_")
        .replace(/^_+|_+$/g, "");

      return {
        id: id || `addon_${index + 1}`,
        name,
        price: Math.max(0, Number(item?.price || 0)),
        unit: String(item?.unit || "รายการ").trim() || "รายการ",
        active: item?.active !== false
      };
    })
    .filter(item => item.name);

  if (normalized.length) return normalized;
  return [];
}

function normalizeBookingAddonItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => {
      const qty = Math.max(0, Number(item?.qty || 0));
      const price = Math.max(0, Number(item?.price || 0));
      return {
        id: String(item?.id || "").trim(),
        name: String(item?.name || "").trim(),
        unit: String(item?.unit || "รายการ").trim() || "รายการ",
        qty,
        price,
        total: Math.max(0, Number(item?.total || qty * price || 0))
      };
    })
    .filter(item => item.name && item.qty > 0);
}

function normalizeHeroContent(hero = {}) {
  const defaults = DEFAULT_SETTINGS.heroContent || {};
  const imageValue = (value, fallback) => {
    if (value && typeof value === "object") return value;
    return String(value ?? fallback ?? "").trim();
  };
  return {
    label: hero.label || defaults.label || "Hero content",
    textPill: String(hero.textPill ?? hero.text_pill ?? defaults.textPill ?? "").trim(),
    textTitle: String(hero.textTitle ?? hero.text_title ?? defaults.textTitle ?? "").trim(),
    textBody: String(hero.textBody ?? hero.text_body ?? defaults.textBody ?? "").trim(),
    textImage: imageValue(hero.textImage ?? hero.text_image, defaults.textImage),
    cardEyebrow: String(hero.cardEyebrow ?? hero.card_eyebrow ?? defaults.cardEyebrow ?? "").trim(),
    cardTitle: String(hero.cardTitle ?? hero.card_title ?? defaults.cardTitle ?? "").trim(),
    cardSubtitle: String(hero.cardSubtitle ?? hero.card_subtitle ?? defaults.cardSubtitle ?? "").trim(),
    cardImage: imageValue(hero.cardImage ?? hero.card_image, defaults.cardImage)
  };
}

function defaultBookingFee() {
  return Math.max(0, Number(typeof BOOKING_FEE !== "undefined" ? BOOKING_FEE : 20));
}

function defaultCreditPerBooking() {
  return Math.max(0, Number(typeof CREDIT_PER_BOOKING !== "undefined" ? CREDIT_PER_BOOKING : 40));
}

function getSettingsBookingFee(settings = {}) {
  return Math.max(0, Number(settings.bookingFee?.value ?? settings.bookingFee ?? defaultBookingFee()));
}

function getSettingsCreditPerBooking(settings = {}) {
  return Math.max(0, Number(settings.creditPerBooking?.value ?? settings.creditPerBooking ?? defaultCreditPerBooking()));
}

function settingObjectFromRow(row = {}) {
  return normalizeSettings({
    siteName: { label: "ชื่อเว็บไซต์", value: row.site_name || DEFAULT_SETTINGS.siteName.value },
    logoUrl: { label: "โลโก้", value: row.logo_url || DEFAULT_SETTINGS.logoUrl.value },
    mookata: { label: "หมูกระทะ", price: Number(row.mookata_price || 0) },
    extraBed: { label: "เตียงเสริม", price: Number(row.extra_bed_price || 0) },
    addons: {
      label: "บริการเสริม",
      items: normalizeAddonItems(row.extra_addons, {
        mookata: { label: "หมูกระทะ", price: Number(row.mookata_price || 0) },
        extraBed: { label: "เตียงเสริม", price: Number(row.extra_bed_price || 0) }
      })
    },
    bankName: { label: "ธนาคาร", value: row.bank_name || "" },
    bankAccountName: { label: "ชื่อบัญชี", value: row.bank_account_name || "" },
    bankAccountNumber: { label: "เลขบัญชี", value: row.bank_account_number || "" },
    pageUrl: { label: "ลิงก์เพจ", value: row.page_url || "" },
    gpsUrl: { label: "ลิงก์ GPS", value: row.gps_url || "" },
    qrCodeUrl: { label: "QR-code ชำระเงิน", value: row.qr_code_url || "" },
    promptPayId: { label: "เลขพร้อมเพย์สำหรับ QR", value: row.promptpay_id || "" },
    bookingFee: { label: "ค่าจอง", value: Number(row.booking_fee ?? defaultBookingFee()) },
    creditPerBooking: { label: "เครดิตที่ใช้ต่อการจอง", value: Number(row.credit_per_booking ?? defaultCreditPerBooking()) },
    paymentNote: { label: "หมายเหตุชำระเงิน", value: row.payment_note || "" },
    heroContent: normalizeHeroContent(row.hero_content || {}),
    propertyPolicy: { label: "นโยบายที่พัก", value: row.property_policy || "" },
    lineToId: { label: "Owner LINE_TO_ID", value: row.line_to_id || "" }
  });
}

function settingsRowFromObject(settings = {}, homestayId) {
  return {
    homestay_id: homestayId,
    site_name: settings.siteName?.value || DEFAULT_SETTINGS.siteName.value,
    logo_url: settings.logoUrl?.value || DEFAULT_SETTINGS.logoUrl.value,
    mookata_price: Number(settings.mookata?.price || 0),
    extra_bed_price: Number(settings.extraBed?.price || 0),
    extra_addons: normalizeAddonItems(settings.addons?.items, settings),
    booking_fee: getSettingsBookingFee(settings),
    credit_per_booking: getSettingsCreditPerBooking(settings),
    bank_name: settings.bankName?.value || "",
    bank_account_name: settings.bankAccountName?.value || "",
    bank_account_number: settings.bankAccountNumber?.value || "",
    promptpay_id: settings.promptPayId?.value || "",
    qr_code_url: settings.qrCodeUrl?.value || "",
    hero_content: normalizeHeroContent(settings.heroContent || {}),
    payment_note: settings.paymentNote?.value || "",
    property_policy: settings.propertyPolicy?.value || ""
  };
}

async function upsertSettingsRow(settingsRow) {
  const optionalColumns = ["credit_per_booking", "hero_content"];
  let row = { ...settingsRow };

  for (let attempt = 0; attempt <= optionalColumns.length; attempt += 1) {
    try {
      return await supabaseRequest("homestay_settings?on_conflict=homestay_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(row)
      });
    } catch (error) {
      if (!isSchemaColumnError(error)) throw error;
      const nextColumn = optionalColumns.find(column => Object.prototype.hasOwnProperty.call(row, column));
      if (!nextColumn) throw error;
      delete row[nextColumn];
    }
  }

  throw new Error("Save settings failed.");
}

function roomObjectFromRow(row = {}) {
  return {
    id: row.id,
    name: row.name || "",
    price: Number(row.price || 0),
    detail: row.detail || "",
    image: row.image_url || "",
    galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : [],
    active: row.active === true,
    closedUntil: row.closed_until || "",
    createdAt: row.created_at || ""
  };
}

function roomRowFromObject(room = {}, homestayId) {
  const galleryImages = normalizeGalleryImages(room);
  const row = {};

  if (homestayId) row.homestay_id = homestayId;
  if (Object.prototype.hasOwnProperty.call(room, "name")) row.name = room.name;
  if (Object.prototype.hasOwnProperty.call(room, "price")) row.price = Number(room.price || 0);
  if (Object.prototype.hasOwnProperty.call(room, "detail")) row.detail = room.detail || "";
  if (Object.prototype.hasOwnProperty.call(room, "active")) row.active = room.active === true;
  if (Object.prototype.hasOwnProperty.call(room, "closedUntil")) row.closed_until = room.closedUntil || null;
  if (Object.prototype.hasOwnProperty.call(room, "closed_until")) row.closed_until = room.closed_until || null;
  if (room.image || galleryImages.length) row.image_url = room.image || galleryImages[0] || "";
  if (room.galleryImageUploads || room.galleryImages) row.gallery_images = galleryImages;

  return row;
}

function bookingObjectFromRow(row = {}) {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    name: row.guest_name,
    phone: row.guest_phone,
    email: row.guest_email || "",
    roomId: row.room_id,
    roomName: row.room_name,
    roomPrice: Number(row.room_price || 0),
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: Number(row.nights || 0),
    guestCount: Number(row.guest_count || 1),
    mookataQty: Number(row.mookata_qty || 0),
    mookataPrice: Number(row.mookata_price || 0),
    extraBedQty: Number(row.extra_bed_qty || 0),
    extraBedPrice: Number(row.extra_bed_price || 0),
    addonItems: normalizeBookingAddonItems(row.addon_items),
    roomTotal: Number(row.room_total || 0),
    addonTotal: Number(row.addon_total || 0),
    bookingFee: Number(row.booking_fee || 0),
    grandTotal: Number(row.grand_total || 0),
    paymentMethod: row.payment_method || "",
    paymentStatus: row.payment_status || "",
    bankName: row.bank_name || "",
    bankAccountName: row.bank_account_name || "",
    bankAccountNumber: row.bank_account_number || "",
    slipFileName: row.slip_file_name || "",
    slipMimeType: row.slip_mime_type || "",
    slipUrl: row.slip_url || "",
    slipVerifyStatus: row.slip_verify_status || "not_checked",
    slipVerifyMessage: row.slip_verify_message || "",
    slipVerifiedAt: row.slip_verified_at || "",
    slipTransferAmount: Number(row.slip_transfer_amount || 0),
    slipTransferRef: row.slip_transfer_ref || "",
    slipVerifyChecks: row.slip_verify_checks || null,
    note: row.note || "",
    status: row.status || "",
    createdAt: row.created_at || ""
  };
}

function bookingRowFromObject(booking = {}, homestayId) {
  return {
    homestay_id: homestayId,
    booking_code: booking.bookingCode,
    guest_name: booking.name,
    guest_phone: booking.phone,
    guest_email: booking.email || "",
    room_id: booking.roomId || null,
    room_name: booking.roomName,
    room_price: Number(booking.roomPrice || 0),
    check_in: booking.checkIn,
    check_out: booking.checkOut,
    nights: Number(booking.nights || 0),
    guest_count: Number(booking.guestCount || 1),
    mookata_qty: Number(booking.mookataQty || 0),
    mookata_price: Number(booking.mookataPrice || 0),
    extra_bed_qty: Number(booking.extraBedQty || 0),
    extra_bed_price: Number(booking.extraBedPrice || 0),
    addon_items: normalizeBookingAddonItems(booking.addonItems),
    room_total: Number(booking.roomTotal || 0),
    addon_total: Number(booking.addonTotal || 0),
    booking_fee: Number(booking.bookingFee || 0),
    grand_total: Number(booking.grandTotal || 0),
    payment_method: booking.paymentMethod || "โอนผ่านบัญชีธนาคาร",
    payment_status: booking.paymentStatus || "รอชำระเงิน",
    bank_name: booking.bankName || "",
    bank_account_name: booking.bankAccountName || "",
    bank_account_number: booking.bankAccountNumber || "",
    slip_file_name: booking.slipFileName || "",
    slip_mime_type: booking.slipMimeType || "",
    slip_url: booking.slipUrl || "",
    slip_verify_status: booking.slipVerifyStatus || "not_checked",
    slip_verify_message: booking.slipVerifyMessage || "",
    slip_verified_at: booking.slipVerifiedAt || null,
    slip_transfer_amount: Number(booking.slipTransferAmount || 0),
    slip_transfer_ref: booking.slipTransferRef || "",
    slip_verify_checks: booking.slipVerifyChecks || null,
    slip_raw_result: booking.slipRawResult || null,
    note: booking.note || "",
    status: booking.status || "รอชำระเงิน"
  };
}

function syncPlanFromRow(row = {}) {
  if (typeof setPlan !== "function" || typeof setCredits !== "function") return;
  if (!row) {
    setPlan("credit", "");
    setCredits(0);
    return;
  }
  setPlan(row.plan_type || "credit", row.plan_started_at || "");
  setCredits(Number(row.credits || 0));
}

function buildPlanPayload(plan = {}, homestayId) {
  const planType = String(plan.planType || plan.plan_type || "credit");
  const credits = Math.max(0, Number(plan.credits || 0));
  const startedAt = plan.planStartedAt || plan.plan_started_at || null;
  const expiresAt = plan.planExpiresAt || plan.plan_expires_at || null;

  return {
    homestay_id: homestayId,
    plan_type: planType,
    credits,
    plan_started_at: startedAt || null,
    plan_expires_at: expiresAt || null,
    status: plan.status || "active"
  };
}

async function saveSupabasePlan(plan = {}, homestayId, options = {}) {
  const planPayload = buildPlanPayload(plan, homestayId);
  const save = payload => supabaseRequest("homestay_plans?on_conflict=homestay_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });

  let rows;
  try {
    rows = await save(planPayload);
  } catch (error) {
    const message = String(error?.message || "");
    const canRetryMinimal = /plan_started_at|plan_expires_at|schema cache|column/i.test(message);
    if (!canRetryMinimal) throw error;

    const minimalPayload = {
      homestay_id: homestayId,
      plan_type: planPayload.plan_type,
      credits: planPayload.credits,
      status: planPayload.status
    };
    rows = await save(minimalPayload);
  }

  const savedPlan = rows?.[0] || planPayload;
  if (options.sync !== false) syncPlanFromRow(savedPlan);
  return savedPlan;
}

async function deductBookingCredits(homestayId, bookingId) {
  const [planRows, settingsRows] = await Promise.all([
    supabaseRequest(`homestay_plans?homestay_id=eq.${homestayId}&select=*`),
    supabaseRequest(`homestay_settings?homestay_id=eq.${homestayId}&select=*`)
  ]);
  const plan = planRows?.[0] || null;
  const planType = plan?.plan_type || "credit";
  const creditPerBooking = getSettingsCreditPerBooking(settingObjectFromRow(settingsRows?.[0] || {}));

  if (planType !== "credit") {
    syncPlanFromRow(plan);
    return plan;
  }

  const currentCredits = Number(
    plan?.credits ?? (typeof getCredits === "function" ? getCredits() : 0)
  );
  const nextCredits = Math.max(0, currentCredits - creditPerBooking);
  const planPayload = {
    homestay_id: homestayId,
    credits: nextCredits,
    plan_type: "credit",
    status: "active"
  };

  const updated = await supabaseRequest("homestay_plans?on_conflict=homestay_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(planPayload)
  });

  await supabaseRequest("credit_ledger", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      homestay_id: homestayId,
      booking_id: bookingId || null,
      amount: -creditPerBooking,
      reason: "booking_created"
    })
  });

  syncPlanFromRow(updated?.[0] || planPayload);
  return updated?.[0] || planPayload;
}

async function getSupabaseHomestay() {
  const slug = encodeURIComponent(getCurrentHomestaySlug());
  const rows = await supabaseRequest(`homestays?slug=eq.${slug}&select=*`);
  const homestay = rows?.[0];
  if (!homestay) throw new Error("ไม่พบโฮมสเตย์นี้ใน Supabase");
  return homestay;
}

async function createSupabaseHomestay(payload = {}) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Please enter a homestay name.");

  const slug = normalizeHomestaySlug(payload.slug || name);
  const warnings = [];
  const logoUrl = payload.logoUrl || DEFAULT_SETTINGS.logoUrl?.value || "";
  const ownerPassword = normalizeOwnerPassword(payload.ownerPassword);
  const lineToId = String(payload.lineToId || payload.line_to_id || "").trim();
  const fullHomestayRow = {
    slug,
    name,
    owner_password: ownerPassword,
    line_to_id: lineToId,
    logo_url: logoUrl,
    page_url: payload.pageUrl || "",
    gps_url: payload.gpsUrl || "",
    status: "active"
  };
  const minimalHomestayRow = { slug, name, owner_password: ownerPassword, status: "active" };
  const legacyHomestayRow = { slug, name, status: "active" };
  const insertHomestay = row => supabaseRequest("homestays", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row)
  });

  let homestayRows;
  try {
    homestayRows = await insertHomestay(fullHomestayRow);
  } catch (error) {
    if (isDuplicateRowError(error)) {
      throw new Error(`Slug "${slug}" is already used. Please choose another slug.`);
    }
    if (!isSchemaColumnError(error)) throw error;

    warnings.push("Saved homestay without optional page/logo/GPS/LINE fields. Run supabase_admin_create_homestay_migration.sql to add those columns.");
    try {
      homestayRows = await insertHomestay(minimalHomestayRow);
    } catch (retryError) {
      if (!isSchemaColumnError(retryError)) throw retryError;
      warnings.push("Saved homestay without owner password column. Run supabase_admin_create_homestay_migration.sql before using custom Owner passwords.");
      homestayRows = await insertHomestay(legacyHomestayRow);
    }
  }

  let homestay = homestayRows?.[0];
  if (!homestay?.id) {
    const foundRows = await supabaseRequest(`homestays?slug=eq.${encodeURIComponent(slug)}&select=*`);
    homestay = foundRows?.[0];
  }
  if (!homestay?.id) throw new Error("Homestay was not created. Check the homestays insert/select policy.");

  const settings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    siteName: { label: "Site name", value: name },
    logoUrl: { label: "Logo", value: logoUrl },
    pageUrl: { label: "Page URL", value: payload.pageUrl || "" },
    gpsUrl: { label: "GPS URL", value: payload.gpsUrl || "" }
  });
  try {
    const globalBookingConfig = await getSupabaseGlobalBookingConfig();
    settings.bookingFee = globalBookingConfig.bookingFee;
    settings.creditPerBooking = globalBookingConfig.creditPerBooking;
  } catch (error) {
    warnings.push(`Using default booking settings: ${error.message || "unknown error"}`);
  }
  const settingsRow = settingsRowFromObject(settings, homestay.id);

  try {
    await upsertSettingsRow(settingsRow);
  } catch (error) {
    if (isSchemaColumnError(error)) {
      try {
        await supabaseRequest("homestay_settings?on_conflict=homestay_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            homestay_id: homestay.id,
            site_name: name
          })
        });
        warnings.push("Saved only basic settings because homestay_settings is missing newer columns.");
      } catch (retryError) {
        warnings.push(`Settings were not created: ${retryError.message || error.message || "unknown error"}`);
      }
    } else {
      warnings.push(`Settings were not created: ${error.message || "unknown error"}`);
    }
  }

  let plan = null;
  try {
    plan = await saveSupabasePlan({
      planType: "credit",
      credits: 0,
      status: "active"
    }, homestay.id);
  } catch (error) {
    warnings.push(`Credit plan was not created: ${error.message || "unknown error"}`);
  }

  return {
    ...homestay,
    name: homestay.name || name,
    slug: homestay.slug || slug,
    ownerPassword: homestay.owner_password || ownerPassword,
    lineToId: homestay.line_to_id || lineToId,
    settings: settingObjectFromRow(settingsRow),
    plan,
    warnings,
    ownerUrl: `owner.html?homestay=${encodeURIComponent(slug)}`,
    customerUrl: `customer.html?homestay=${encodeURIComponent(slug)}`
  };
}

async function updateSupabaseOwnerPassword(homestayId, ownerPassword) {
  const password = normalizeOwnerPassword(ownerPassword);
  const rows = await supabaseRequest(`homestays?id=eq.${encodeURIComponent(homestayId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ owner_password: password })
  });
  return rows?.[0] || { id: homestayId, owner_password: password };
}

async function updateSupabaseHomestayLineToId(homestayId, lineToId) {
  const nextLineToId = String(lineToId || "").trim();
  const rows = await supabaseRequest(`homestays?id=eq.${encodeURIComponent(homestayId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ line_to_id: nextLineToId })
  });
  return rows?.[0] || { id: homestayId, line_to_id: nextLineToId };
}

async function getSupabaseGlobalBookingConfig() {
  let rows;
  try {
    rows = await supabaseRequest("homestay_settings?select=booking_fee,credit_per_booking&limit=1");
  } catch (error) {
    if (!isSchemaColumnError(error)) throw error;
    rows = await supabaseRequest("homestay_settings?select=booking_fee&limit=1");
  }
  return normalizeSettings({
    bookingFee: { label: "ค่าจอง", value: Number(rows?.[0]?.booking_fee ?? defaultBookingFee()) },
    creditPerBooking: { label: "เครดิตที่ใช้ต่อการจอง", value: Number(rows?.[0]?.credit_per_booking ?? defaultCreditPerBooking()) }
  });
}

async function updateSupabaseGlobalBookingConfig(settings = {}) {
  const bookingFee = getSettingsBookingFee(settings);
  const creditPerBooking = getSettingsCreditPerBooking(settings);
  const homestays = await supabaseRequest("homestays?select=id");

  await Promise.all((homestays || []).map(homestay => upsertSettingsRow({
    homestay_id: homestay.id,
    booking_fee: bookingFee,
    credit_per_booking: creditPerBooking
  })));

  return normalizeSettings({
    bookingFee: { label: "ค่าจอง", value: bookingFee },
    creditPerBooking: { label: "เครดิตที่ใช้ต่อการจอง", value: creditPerBooking }
  });
}

async function listSupabaseAdminHomestays() {
  const [homestayRows, planRows] = await Promise.all([
    supabaseRequest("homestays?select=*&order=created_at.desc"),
    supabaseRequest("homestay_plans?select=*")
  ]);
  const planByHomestay = new Map((planRows || []).map(plan => [plan.homestay_id, plan]));

  return (homestayRows || []).map(homestay => {
    const plan = planByHomestay.get(homestay.id) || null;
    const slug = homestay.slug || "";
    return {
      ...homestay,
      plan,
      credits: Number(plan?.credits || 0),
      planType: plan?.plan_type || "credit",
      ownerPassword: homestay.owner_password || getDefaultOwnerPassword(),
      lineToId: homestay.line_to_id || "",
      ownerUrl: `owner.html?homestay=${encodeURIComponent(slug)}`,
      customerUrl: `customer.html?homestay=${encodeURIComponent(slug)}`
    };
  });
}

function getSiteName(settings = {}) {
  return String(settings.siteName?.value || DEFAULT_SETTINGS.siteName?.value || "ชื่อที่พัก").trim() || "ชื่อที่พัก";
}

function getLogoUrl(settings = {}) {
  return String(settings.logoUrl?.value || DEFAULT_SETTINGS.logoUrl?.value || "default-home-logo.svg").trim() || "default-home-logo.svg";
}

function applyBrandAssets(settings = {}, pageSuffix = "") {
  const siteName = getSiteName(settings);
  const logoUrl = getLogoUrl(settings);
  const suffix = String(pageSuffix || document.body?.dataset?.pageTitleSuffix || "").trim();

  document.querySelectorAll("img.site-logo, img.logo").forEach(img => {
    img.src = logoUrl;
  });

  document.querySelectorAll("header.topbar .brand h1").forEach(el => {
    el.textContent = siteName;
  });

  document.title = suffix ? `${siteName} - ${suffix}` : siteName;

  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach(link => {
    link.href = logoUrl;
    if (link.rel !== "apple-touch-icon") {
      link.type = logoUrl.startsWith("data:image/")
        ? logoUrl.slice(5, logoUrl.indexOf(";"))
        : (logoUrl.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/jpeg");
    }
  });

  applyHeroContent(settings);
}

function applyHeroContent(settings = {}) {
  const hero = normalizeHeroContent(settings.heroContent || {});
  const heroText = document.querySelector(".hero-text");
  const heroCard = document.querySelector(".hero-card");
  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.textContent = value;
  };
  const hideLegacyImage = selector => {
    const img = document.querySelector(selector);
    if (!img) return;
    img.classList.add("hidden");
    img.removeAttribute("src");
    img.alt = "";
  };
  const setHeroBackground = (el, value, overlay) => {
    if (!el) return;
    const url = String(value || "").trim();
    if (url) {
      el.style.backgroundImage = `${overlay}, url(${JSON.stringify(url)})`;
    } else {
      el.style.removeProperty("background-image");
    }
  };

  if (heroText) {
    setText(".hero-text .pill", hero.textPill);
    setText(".hero-text h2", hero.textTitle);
    setText(".hero-text p", hero.textBody);
    setHeroBackground(
      heroText,
      hero.textImage,
      "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(232,246,239,0.86))"
    );
    hideLegacyImage(".hero-text .hero-text-image");
  }

  if (heroCard) {
    setText(".hero-card p", hero.cardEyebrow);
    setText(".hero-card strong", hero.cardTitle);
    setText(".hero-card span", hero.cardSubtitle);
    setHeroBackground(
      heroCard,
      hero.cardImage,
      "linear-gradient(180deg, rgba(15,61,46,0.06), rgba(15,61,46,0.88))"
    );
    hideLegacyImage(".hero-card .hero-card-image");
  }
}

function emvField(id, value) {
  const data = String(value || "");
  return `${id}${String(data.length).padStart(2, "0")}${data}`;
}

function crc16CcittFalse(value) {
  let crc = 0xFFFF;

  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizePromptPayTarget(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) return null;

  if (digits.length === 10 && digits.startsWith("0")) {
    return { tag: "01", value: `0066${digits.slice(1)}` };
  }

  if (digits.length === 11 && digits.startsWith("66")) {
    return { tag: "01", value: `00${digits}` };
  }

  if (digits.length === 13) {
    return { tag: "02", value: digits };
  }

  if (digits.length === 15) {
    return { tag: "03", value: digits };
  }

  return null;
}

function buildPromptPayPayload(payeeId, amount) {
  const target = normalizePromptPayTarget(payeeId);
  const paymentAmount = Number(amount || 0);

  if (!target) return "";

  const merchantInfo = emvField("00", "A000000677010111") + emvField(target.tag, target.value);
  const amountField = paymentAmount > 0 ? emvField("54", paymentAmount.toFixed(2)) : "";
  const payloadWithoutCrc = [
    emvField("00", "01"),
    emvField("01", "12"),
    emvField("29", merchantInfo),
    emvField("53", "764"),
    amountField,
    emvField("58", "TH")
  ].join("") + "6304";

  return payloadWithoutCrc + crc16CcittFalse(payloadWithoutCrc);
}

function buildTransferQrText(settings = {}, amount = 0) {
  const bankName = settings.bankName?.value || DEFAULT_SETTINGS.bankName.value || "";
  const accountName = settings.bankAccountName?.value || DEFAULT_SETTINGS.bankAccountName.value || "";
  const accountNumber = settings.bankAccountNumber?.value || DEFAULT_SETTINGS.bankAccountNumber.value || "";

  return [
    "TRANSFER",
    `BANK:${bankName}`,
    `ACCOUNT_NAME:${accountName}`,
    `ACCOUNT_NUMBER:${accountNumber}`,
    `AMOUNT:${Number(amount || 0).toFixed(2)}`
  ].join("\n");
}

function buildPaymentQrPayload(settings = {}, amount = 0) {
  const promptPayId = String(settings.promptPayId?.value || "").trim();
  // ถ้ามี PromptPay ID → ใช้ EMV PromptPay format (ธนาคารสแกนได้)
  if (promptPayId) {
    return buildPromptPayPayload(promptPayId, amount);
  }
  // fallback → transfer text (ไว้แสดงข้อมูลบัญชีเท่านั้น)
  return buildTransferQrText(settings, amount);
}

function uploadsToImageUrls(uploads = []) {
  return (Array.isArray(uploads) ? uploads : [])
    .filter(upload => upload && upload.mimeType && upload.base64)
    .map(upload => `data:${upload.mimeType};base64,${upload.base64}`)
    .slice(0, 5);
}

function safeStorageName(value) {
  const fallback = `file-${Date.now()}`;
  return String(value || fallback)
    .trim()
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || fallback;
}

function base64ToBlob(base64, mimeType = "application/octet-stream") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

async function supabaseUploadBase64(bucket, path, base64, mimeType) {
  const url = `${supabaseBaseUrl()}/storage/v1/object/${bucket}/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": mimeType || "application/octet-stream",
      "x-upsert": "true"
    },
    body: base64ToBlob(base64, mimeType)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || response.statusText || "Supabase Storage upload failed");
  }
  return path;
}

function supabasePublicFileUrl(bucket, path) {
  return `${supabaseBaseUrl()}/storage/v1/object/public/${bucket}/${path}`;
}

async function supabaseSignedFileUrl(bucket, path, expiresIn = 60 * 60 * 24 * 30) {
  const url = `${supabaseBaseUrl()}/storage/v1/object/sign/${bucket}/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn })
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) return "";
  if (!data?.signedURL) return "";
  const signedPath = String(data.signedURL);
  return signedPath.startsWith("/storage/v1/")
    ? `${supabaseBaseUrl()}${signedPath}`
    : `${supabaseBaseUrl()}/storage/v1${signedPath}`;
}

async function uploadPublicAsset(upload, path) {
  if (!upload?.base64 || !upload?.mimeType) return "";
  await supabaseUploadBase64("homestay-assets", path, upload.base64, upload.mimeType);
  return supabasePublicFileUrl("homestay-assets", path);
}

async function uploadLogoToStorage(settings = {}, homestaySlug) {
  const nextSettings = { ...settings };
  const logo = nextSettings.logoUrl;

  if (logo?.base64 && logo?.mimeType) {
    const fileName = safeStorageName(logo.fileName || `logo-${Date.now()}`);
    const path = `${safeStorageName(homestaySlug)}/brand/${Date.now()}-${fileName}`;
    const logoUrl = await uploadPublicAsset(logo, path);

    nextSettings.logoUrl = {
      label: logo.label || "โลโก้",
      value: logoUrl
    };
  }

  const heroContent = normalizeHeroContent(nextSettings.heroContent || {});
  for (const key of ["textImage", "cardImage"]) {
    const upload = heroContent[key];
    if (upload?.base64 && upload?.mimeType) {
      const fileName = safeStorageName(upload.fileName || `${key}-${Date.now()}`);
      const path = `${safeStorageName(homestaySlug)}/hero/${Date.now()}-${fileName}`;
      heroContent[key] = await uploadPublicAsset(upload, path);
    }
  }
  nextSettings.heroContent = heroContent;

  const qrCode = nextSettings.qrCodeUrl;
  if (qrCode?.base64 && qrCode?.mimeType) {
    const fileName = safeStorageName(qrCode.fileName || `payment-qr-${Date.now()}`);
    const path = `${safeStorageName(homestaySlug)}/payment/${Date.now()}-${fileName}`;
    const qrCodeUrl = await uploadPublicAsset(qrCode, path);

    nextSettings.qrCodeUrl = {
      label: qrCode.label || "QR-code ชำระเงิน",
      value: qrCodeUrl
    };
  }

  return nextSettings;
}

async function uploadRoomImagesToStorage(room = {}, homestaySlug, roomId) {
  const uploads = Array.isArray(room.galleryImageUploads) && room.galleryImageUploads.length
    ? room.galleryImageUploads
    : (room.imageUpload ? [room.imageUpload] : []);

  const validUploads = uploads
    .filter(upload => upload?.base64 && upload?.mimeType)
    .slice(0, 5);

  if (!validUploads.length) return null;

  const folder = `${safeStorageName(homestaySlug)}/rooms/${safeStorageName(roomId || Date.now())}`;
  const urls = [];

  for (const [index, upload] of validUploads.entries()) {
    const fileName = safeStorageName(upload.fileName || `room-${index + 1}`);
    const path = `${folder}/${Date.now()}-${index + 1}-${fileName}`;
    urls.push(await uploadPublicAsset(upload, path));
  }

  return urls;
}

async function uploadSlipToStorage(booking = {}, homestaySlug) {
  if (!booking.slipBase64 || !booking.slipMimeType) return booking.slipUrl || "";

  const bookingCode = safeStorageName(booking.bookingCode || booking.id || Date.now());
  const fileName = safeStorageName(booking.slipFileName || `slip-${Date.now()}`);
  const path = `${safeStorageName(homestaySlug)}/bookings/${bookingCode}/${Date.now()}-${fileName}`;
  await supabaseUploadBase64("payment-slips", path, booking.slipBase64, booking.slipMimeType);

  return path;
}

async function signBookingSlipUrls(bookings = []) {
  const items = Array.isArray(bookings) ? bookings : [bookings];
  const signedItems = await Promise.all(items.map(async booking => {
    const slipUrl = String(booking?.slipUrl || "").trim();
    if (!slipUrl || /^https?:\/\//.test(slipUrl) || slipUrl.startsWith("data:")) return booking;

    const signedUrl = await supabaseSignedFileUrl("payment-slips", slipUrl);
    return { ...booking, slipUrl: signedUrl || slipUrl };
  }));

  return Array.isArray(bookings) ? signedItems : signedItems[0];
}

function queueSlipVerification(bookingId, homestaySlug) {
  if (!bookingId || !isSupabaseReady) return;
  supabaseFunctionRequest("verify-slip", {
    bookingId,
    homestaySlug
  }).catch(error => {
    console.warn("Auto slip verification failed", error);
  });
}

function queueLineBookingNotification(booking = {}, homestay = {}) {
  if (!booking?.id || !isSupabaseReady) return;
  const functionName = String(typeof LINE_BOOKING_NOTIFY_FUNCTION_NAME !== "undefined"
    ? LINE_BOOKING_NOTIFY_FUNCTION_NAME
    : "line-booking-notify").trim() || "line-booking-notify";
  supabaseFunctionRequest(functionName, {
    booking,
    homestay: {
      id: homestay.id || "",
      name: homestay.name || "",
      slug: homestay.slug || "",
      lineToId: homestay.lineToId || homestay.line_to_id || ""
    }
  }).catch(error => {
    console.warn("LINE booking notification skipped:", error?.message || error);
  });
}

function normalizeGalleryImages(room = {}) {
  const images = [];
  const addImage = value => {
    const url = String(value || "").trim();
    if (url && !images.includes(url)) images.push(url);
  };

  addImage(room.image);

  if (Array.isArray(room.galleryImages)) {
    room.galleryImages.forEach(addImage);
  } else if (typeof room.galleryImages === "string") {
    try {
      const parsed = JSON.parse(room.galleryImages);
      if (Array.isArray(parsed)) parsed.forEach(addImage);
    } catch {
      room.galleryImages.split("|").forEach(addImage);
    }
  }

  return images.slice(0, 5);
}

function getPaymentQrImageUrl(settings = {}, amount = 0, size = 260) {
  const payload = buildPaymentQrPayload(settings, amount);
  const qrSize = Math.max(160, Math.min(Number(size || 260), 420));

  if (!payload) return "";

  return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=10&data=${encodeURIComponent(payload)}`;
}

async function apiRequest(payload) {
  if (isSupabaseReady) {
    return supabaseApiRequest(payload);
  }

  if (!isGoogleSheetReady) {
    return localApiRequest(payload);
  }

  const action = payload.action || "list";

  if (["list", "settings", "rooms", "bootstrap"].includes(action)) {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=${action}&cache=${Date.now()}`);
    if (!response.ok) throw new Error("โหลดข้อมูลจาก Google Sheet ไม่สำเร็จ");
    return response.json();
  }

  if (action === "lookupBooking") {
    const code = encodeURIComponent(payload.bookingCode || "");
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=lookupBooking&bookingCode=${code}&cache=${Date.now()}`);
    if (!response.ok) throw new Error("ค้นหารายการจองไม่สำเร็จ");
    return response.json();
  }

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("บันทึกข้อมูลไป Google Sheet ไม่สำเร็จ");
  return response.json();
}

async function supabaseApiRequest(payload) {
  const action = payload.action || "list";

  if (action === "createHomestay") {
    const homestay = await createSupabaseHomestay(payload.homestay || {});
    return { ok: true, data: homestay, mode: "supabase" };
  }

  if (action === "adminListHomestays") {
    const homestays = await listSupabaseAdminHomestays();
    return { ok: true, data: homestays, count: homestays.length, mode: "supabase" };
  }

  if (action === "adminGetBookingConfig") {
    const settings = await getSupabaseGlobalBookingConfig();
    return { ok: true, data: settings, mode: "supabase" };
  }

  if (action === "adminUpdateGlobalBookingConfig") {
    const settings = await updateSupabaseGlobalBookingConfig(payload.settings || {});
    return { ok: true, data: settings, mode: "supabase" };
  }

  if (action === "adminUpdateHomestayPlan") {
    const homestayId = String(payload.homestayId || "").trim();
    if (!homestayId) throw new Error("Missing homestay id.");
    const plan = await saveSupabasePlan(payload.plan || {}, homestayId, { sync: false });
    return { ok: true, data: plan, mode: "supabase" };
  }

  if (action === "adminUpdateOwnerPassword") {
    const homestayId = String(payload.homestayId || "").trim();
    if (!homestayId) throw new Error("Missing homestay id.");
    const homestay = await updateSupabaseOwnerPassword(homestayId, payload.ownerPassword);
    return { ok: true, data: { ...homestay, ownerPassword: homestay.owner_password || normalizeOwnerPassword(payload.ownerPassword) }, mode: "supabase" };
  }

  if (action === "adminUpdateHomestayLineToId") {
    const homestayId = String(payload.homestayId || "").trim();
    if (!homestayId) throw new Error("Missing homestay id.");
    const homestay = await updateSupabaseHomestayLineToId(homestayId, payload.lineToId);
    return { ok: true, data: { ...homestay, lineToId: homestay.line_to_id || "" }, mode: "supabase" };
  }

  if (action === "adminDeleteHomestay") {
    const homestayId = String(payload.homestayId || "").trim();
    if (!homestayId) throw new Error("Missing homestay id.");
    await supabaseRequest(`homestays?id=eq.${encodeURIComponent(homestayId)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    return { ok: true, mode: "supabase" };
  }

  const homestay = await getSupabaseHomestay();
  const homestayId = homestay.id;

  if (action === "ownerLogin") {
    const expectedPassword = String(homestay.owner_password || getDefaultOwnerPassword()).trim();
    const incomingPassword = String(payload.password || "").trim();
    return {
      ok: incomingPassword === expectedPassword,
      data: {
        homestayId,
        slug: homestay.slug,
        name: homestay.name
      },
      mode: "supabase"
    };
  }

  if (action === "ownerUpdatePassword") {
    const updatedHomestay = await updateSupabaseOwnerPassword(homestayId, payload.ownerPassword);
    return {
      ok: true,
      data: {
        ...updatedHomestay,
        ownerPassword: updatedHomestay.owner_password || normalizeOwnerPassword(payload.ownerPassword)
      },
      mode: "supabase"
    };
  }

  if (action === "ownerUpdateLineToId") {
    const updatedHomestay = await updateSupabaseHomestayLineToId(homestayId, payload.lineToId);
    return {
      ok: true,
      data: {
        id: updatedHomestay.id || homestayId,
        slug: updatedHomestay.slug || homestay.slug,
        name: updatedHomestay.name || homestay.name,
        lineToId: updatedHomestay.line_to_id || ""
      },
      mode: "supabase"
    };
  }

  if (action === "bootstrap") {
    const [settingsRows, roomRows, bookingRows, planRows] = await Promise.all([
      supabaseRequest(`homestay_settings?homestay_id=eq.${homestayId}&select=*`),
      supabaseRequest(`rooms?homestay_id=eq.${homestayId}&select=*&order=sort_order.asc,created_at.asc`),
      supabaseRequest(`bookings?homestay_id=eq.${homestayId}&select=*&order=created_at.desc`),
      supabaseRequest(`homestay_plans?homestay_id=eq.${homestayId}&select=*`)
    ]);
    syncPlanFromRow(planRows?.[0]);

    const bookings = await signBookingSlipUrls((bookingRows || []).map(bookingObjectFromRow));

    return {
      ok: true,
      data: {
        homestay,
        plan: planRows?.[0] || null,
        settings: settingObjectFromRow({ ...(settingsRows?.[0] || {}), page_url: homestay.page_url, gps_url: homestay.gps_url, logo_url: settingsRows?.[0]?.logo_url || homestay.logo_url, line_to_id: homestay.line_to_id }),
        rooms: (roomRows || []).map(roomObjectFromRow),
        bookings
      },
      mode: "supabase"
    };
  }

  if (action === "settings") {
    const rows = await supabaseRequest(`homestay_settings?homestay_id=eq.${homestayId}&select=*`);
    return { ok: true, data: settingObjectFromRow(rows?.[0] || {}), mode: "supabase" };
  }

  if (action === "rooms") {
    const rows = await supabaseRequest(`rooms?homestay_id=eq.${homestayId}&select=*&order=sort_order.asc,created_at.asc`);
    return { ok: true, data: (rows || []).map(roomObjectFromRow), mode: "supabase" };
  }

  if (action === "list") {
    const rows = await supabaseRequest(`bookings?homestay_id=eq.${homestayId}&select=*&order=created_at.desc`);
    return { ok: true, data: await signBookingSlipUrls((rows || []).map(bookingObjectFromRow)), mode: "supabase" };
  }

  if (action === "lookupBooking") {
    const code = encodeURIComponent(String(payload.bookingCode || "").trim());
    const rows = await supabaseRequest(`bookings?homestay_id=eq.${homestayId}&booking_code=eq.${code}&select=*&limit=1`);
    if (rows?.[0]?.id && rows?.[0]?.slip_url) {
      queueSlipVerification(rows[0].id, homestay.slug);
    }

    const booking = rows?.[0] ? await signBookingSlipUrls(bookingObjectFromRow(rows[0])) : null;
    if (booking) queueLineBookingNotification(booking, homestay);
    return { ok: true, data: booking, mode: "supabase" };
  }

  if (action === "updateSettings") {
    const uploadedSettings = await uploadLogoToStorage(payload.settings || {}, homestay.slug);
    const settingsRow = settingsRowFromObject(uploadedSettings, homestayId);
    const rows = await upsertSettingsRow(settingsRow);

    await supabaseRequest(`homestays?id=eq.${homestayId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        name: settingsRow.site_name,
        logo_url: settingsRow.logo_url,
        page_url: uploadedSettings.pageUrl?.value || "",
        gps_url: uploadedSettings.gpsUrl?.value || ""
      })
    });

    return { ok: true, data: settingObjectFromRow(rows?.[0] || settingsRow), mode: "supabase" };
  }

  if (action === "updatePlan") {
    const plan = await saveSupabasePlan(payload.plan || {}, homestayId);
    return { ok: true, data: plan, mode: "supabase" };
  }

  if (action === "resetPlan") {
    const plan = await saveSupabasePlan({
      planType: "credit",
      credits: 0,
      planStartedAt: null,
      planExpiresAt: null,
      status: "active"
    }, homestayId);
    return { ok: true, data: plan, mode: "supabase" };
  }

  if (action === "createRoom") {
    const roomId = crypto.randomUUID ? crypto.randomUUID() : "";
    const uploadedImages = await uploadRoomImagesToStorage(payload.room || {}, homestay.slug, roomId || Date.now());
    const roomPayload = uploadedImages
      ? { ...(payload.room || {}), image: uploadedImages[0], galleryImages: uploadedImages }
      : (payload.room || {});
    const row = roomRowFromObject(roomPayload, homestayId);
    if (roomId) row.id = roomId;
    const rows = await supabaseRequest("rooms", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row)
    });
    return { ok: true, data: roomObjectFromRow(rows?.[0] || {}), mode: "supabase" };
  }

  if (action === "updateRoom") {
    const uploadedImages = await uploadRoomImagesToStorage(payload.room || {}, homestay.slug, payload.id);
    const roomPayload = uploadedImages
      ? { ...(payload.room || {}), image: uploadedImages[0], galleryImages: uploadedImages }
      : (payload.room || {});
    const row = roomRowFromObject(roomPayload);
    const rows = await supabaseRequest(`rooms?id=eq.${payload.id}&homestay_id=eq.${homestayId}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row)
    });
    return { ok: true, data: rows?.[0] ? roomObjectFromRow(rows[0]) : null, mode: "supabase" };
  }

  if (action === "deleteRoom") {
    await supabaseRequest(`rooms?id=eq.${payload.id}&homestay_id=eq.${homestayId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    return { ok: true, mode: "supabase" };
  }

  if (action === "create") {
    const slipUrl = await uploadSlipToStorage(payload.booking || {}, homestay.slug);
    const row = bookingRowFromObject({ ...(payload.booking || {}), slipUrl }, homestayId);
    const rows = await supabaseRequest("bookings", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row)
    });

    await deductBookingCredits(homestayId, rows?.[0]?.id || null);

    if (rows?.[0]?.id && slipUrl && String(row.slip_verify_status || "not_checked") === "not_checked") {
      queueSlipVerification(rows[0].id, homestay.slug);
    }

    const booking = rows?.[0] ? await signBookingSlipUrls(bookingObjectFromRow(rows[0])) : null;
    return { ok: true, data: booking, mode: "supabase" };
  }

  if (action === "updateStatus") {
    const next = { status: payload.status };
    if (payload.status === "ชำระแล้ว" || payload.status === "ยืนยันแล้ว") next.payment_status = "ชำระแล้ว";
    if (payload.status === "ยกเลิก") next.payment_status = "ยกเลิก";

    await supabaseRequest(`bookings?id=eq.${payload.id}&homestay_id=eq.${homestayId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(next)
    });
    return { ok: true, mode: "supabase" };
  }

  if (action === "verifySlip") {
    const result = await supabaseFunctionRequest("verify-slip", {
      bookingId: payload.id,
      homestaySlug: homestay.slug
    });
    return { ok: true, data: result.data || null, mode: "supabase" };
  }

  if (action === "precheckSlip") {
    try {
      const result = await supabaseFunctionRequest("verify-slip", {
        homestaySlug: homestay.slug,
        slipBase64: payload.slipBase64 || "",
        booking: payload.booking || {}
      });
      return { ok: true, data: result.data || null, mode: "supabase" };
    } catch (error) {
      // Edge Function ไม่พร้อมหรือ error → ข้ามการตรวจสลิปแล้วให้บันทึกจองต่อได้
      console.warn("precheckSlip skipped:", error?.message);
      return { ok: false, message: error?.message || "ตรวจสลิปไม่สำเร็จ", mode: "supabase" };
    }
  }

  if (action === "delete") {
    await supabaseRequest(`bookings?id=eq.${payload.id}&homestay_id=eq.${homestayId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    return { ok: true, mode: "supabase" };
  }

  return { ok: false, message: "ไม่พบ action ใน Supabase" };
}

async function localApiRequest(payload) {
  let bookings = localGetBookings();
  let rooms = localGetRooms();
  let settings = localGetSettings();

  if (payload.action === "bootstrap") {
    return { ok: true, data: { bookings, rooms, settings }, mode: "local" };
  }

  if (payload.action === "ownerLogin") {
    const slug = typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "homestay";
    const incomingPassword = String(payload.password || "").trim();
    const expectedPassword = String(localGetHomestayPassword(slug)).trim();
    return {
      ok: incomingPassword === expectedPassword,
      data: { slug },
      mode: "local"
    };
  }

  if (payload.action === "ownerUpdatePassword") {
    const slug = typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "homestay";
    const ownerPassword = normalizeOwnerPassword(payload.ownerPassword);
    localSaveHomestayPassword(slug, ownerPassword);
    return { ok: true, data: { id: slug, slug, ownerPassword }, mode: "local" };
  }

  if (payload.action === "ownerUpdateLineToId") {
    const slug = typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "homestay";
    const lineToId = String(payload.lineToId || "").trim();
    settings = {
      ...settings,
      lineToId: { label: "Owner LINE_TO_ID", value: lineToId }
    };
    localSaveSettings(settings);
    return { ok: true, data: { id: slug, slug, lineToId }, mode: "local" };
  }

  if (payload.action === "lookupBooking") {
    const code = String(payload.bookingCode || "").trim().toLowerCase();
    const booking = bookings.find(item =>
      String(item.bookingCode || item.id || "").trim().toLowerCase() === code
    ) || null;
    return { ok: true, data: booking, mode: "local" };
  }

  if (payload.action === "settings") {
    return { ok: true, data: settings, mode: "local" };
  }

  if (payload.action === "rooms") {
    return { ok: true, data: rooms, mode: "local" };
  }

  if (payload.action === "list") {
    return { ok: true, data: bookings, rooms, settings, mode: "local" };
  }

  if (payload.action === "updateSettings") {
    const incomingSettings = payload.settings || {};

    if (incomingSettings.logoUrl && incomingSettings.logoUrl.base64) {
      incomingSettings.logoUrl = {
        label: incomingSettings.logoUrl.label || "โลโก้",
        value: `data:${incomingSettings.logoUrl.mimeType};base64,${incomingSettings.logoUrl.base64}`
      };
    }

    if (incomingSettings.qrCodeUrl && incomingSettings.qrCodeUrl.base64) {
      incomingSettings.qrCodeUrl = {
        label: incomingSettings.qrCodeUrl.label || "QR-code ชำระเงิน",
        value: `data:${incomingSettings.qrCodeUrl.mimeType};base64,${incomingSettings.qrCodeUrl.base64}`
      };
    }

    if (incomingSettings.heroContent) {
      incomingSettings.heroContent = normalizeHeroContent(incomingSettings.heroContent);
      ["textImage", "cardImage"].forEach(key => {
        const upload = incomingSettings.heroContent[key];
        if (upload?.base64 && upload?.mimeType) {
          incomingSettings.heroContent[key] = `data:${upload.mimeType};base64,${upload.base64}`;
        }
      });
    }

    settings = { ...settings, ...incomingSettings };
    localSaveSettings(settings);
    return { ok: true, data: settings, mode: "local" };
  }

  if (payload.action === "createHomestay") {
    const homestay = payload.homestay || {};
    const name = String(homestay.name || "").trim();
    if (!name) return { ok: false, message: "กรุณากรอกชื่อโฮมสเตย์", mode: "local" };
    const slug = normalizeHomestaySlug(homestay.slug || name);
    const ownerPassword = normalizeOwnerPassword(homestay.ownerPassword);
    const lineToId = String(homestay.lineToId || homestay.line_to_id || "").trim();
    localSaveHomestayPassword(slug, ownerPassword);
    settings = {
      ...settings,
      lineToId: { label: "Owner LINE_TO_ID", value: lineToId }
    };
    localSaveSettings(settings);
    return {
      ok: true,
      data: {
        id: slug,
        slug,
        name,
        ownerPassword,
        lineToId,
        ownerUrl: `owner.html?homestay=${encodeURIComponent(slug)}`,
        customerUrl: `customer.html?homestay=${encodeURIComponent(slug)}`
      },
      mode: "local"
    };
  }

  if (payload.action === "adminListHomestays") {
    const slug = typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "homestay";
    const planType = typeof getPlanType === "function" ? getPlanType() : "credit";
    const credits = typeof getCredits === "function" ? getCredits() : 0;
    return {
      ok: true,
      data: [{
        id: slug,
        slug,
        name: settings.siteName?.value || DEFAULT_SETTINGS.siteName?.value || slug,
        credits,
        planType,
        plan: { plan_type: planType, credits },
        ownerPassword: localGetHomestayPassword(slug),
        lineToId: settings.lineToId?.value || "",
        ownerUrl: `owner.html?homestay=${encodeURIComponent(slug)}`,
        customerUrl: `customer.html?homestay=${encodeURIComponent(slug)}`
      }],
      count: 1,
      mode: "local"
    };
  }

  if (payload.action === "adminGetBookingConfig") {
    return {
      ok: true,
      data: normalizeSettings({
        bookingFee: settings.bookingFee,
        creditPerBooking: settings.creditPerBooking
      }),
      mode: "local"
    };
  }

  if (payload.action === "adminUpdateGlobalBookingConfig") {
    const incomingSettings = normalizeSettings(payload.settings || {});
    settings = {
      ...settings,
      bookingFee: incomingSettings.bookingFee,
      creditPerBooking: incomingSettings.creditPerBooking
    };
    localSaveSettings(settings);
    return { ok: true, data: normalizeSettings(settings), mode: "local" };
  }

  if (payload.action === "adminUpdateHomestayPlan") {
    const plan = payload.plan || {};
    setPlan(plan.planType || plan.plan_type || "credit", plan.planStartedAt || plan.plan_started_at || "");
    setCredits(Number(plan.credits || 0));
    return { ok: true, data: plan, mode: "local" };
  }

  if (payload.action === "adminUpdateOwnerPassword") {
    const slug = payload.homestayId || (typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "homestay");
    const ownerPassword = normalizeOwnerPassword(payload.ownerPassword);
    localSaveHomestayPassword(slug, ownerPassword);
    return { ok: true, data: { id: slug, slug, ownerPassword }, mode: "local" };
  }

  if (payload.action === "adminUpdateHomestayLineToId") {
    const slug = payload.homestayId || (typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "homestay");
    const lineToId = String(payload.lineToId || "").trim();
    settings = {
      ...settings,
      lineToId: { label: "Owner LINE_TO_ID", value: lineToId }
    };
    localSaveSettings(settings);
    return { ok: true, data: { id: slug, slug, lineToId }, mode: "local" };
  }

  if (payload.action === "adminDeleteHomestay") {
    return { ok: true, mode: "local" };
  }

  if (payload.action === "updatePlan") {
    const plan = payload.plan || {};
    setPlan(plan.planType || plan.plan_type || "credit", plan.planStartedAt || plan.plan_started_at || "");
    setCredits(Number(plan.credits || 0));
    return { ok: true, data: plan, mode: "local" };
  }

  if (payload.action === "resetPlan") {
    setPlan("credit", "");
    setCredits(0);
    return { ok: true, data: { plan_type: "credit", credits: 0, status: "active" }, mode: "local" };
  }

  if (payload.action === "createRoom") {
    const payloadRoom = payload.room || {};
    const galleryImages = uploadsToImageUrls(payloadRoom.galleryImageUploads);
    const room = {
      ...payloadRoom,
      image: payloadRoom.image || galleryImages[0] || (payloadRoom.imageUpload ? `data:${payloadRoom.imageUpload.mimeType};base64,${payloadRoom.imageUpload.base64}` : ""),
      galleryImages,
      imageUpload: undefined,
      galleryImageUploads: undefined,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      active: true,
      createdAt: new Date().toISOString()
    };
    rooms.push(room);
    localSaveRooms(rooms);
    return { ok: true, data: room, mode: "local" };
  }

  if (payload.action === "updateRoom") {
    const payloadRoom = payload.room || {};
    const nextRoom = {
      ...payloadRoom,
      imageUpload: undefined
    };

    if (payloadRoom.imageUpload) {
      nextRoom.image = `data:${payloadRoom.imageUpload.mimeType};base64,${payloadRoom.imageUpload.base64}`;
    } else if (Object.prototype.hasOwnProperty.call(payloadRoom, "image")) {
      nextRoom.image = payloadRoom.image;
    } else {
      delete nextRoom.image;
    }

    if (payloadRoom.galleryImageUploads) {
      nextRoom.galleryImages = uploadsToImageUrls(payloadRoom.galleryImageUploads);
      nextRoom.galleryImageUploads = undefined;
      if (!nextRoom.image && nextRoom.galleryImages.length) nextRoom.image = nextRoom.galleryImages[0];
    }

    rooms = rooms.map(room => room.id === payload.id ? { ...room, ...nextRoom } : room);
    localSaveRooms(rooms);
    return { ok: true, mode: "local" };
  }

  if (payload.action === "deleteRoom") {
    rooms = rooms.filter(room => room.id !== payload.id);
    localSaveRooms(rooms);
    return { ok: true, mode: "local" };
  }

  if (payload.action === "create") {
    const booking = {
      ...payload.booking,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString()
    };
    bookings.unshift(booking);
    localSaveBookings(bookings);
    queueLineBookingNotification(booking, { slug: typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "homestay" });
    return { ok: true, data: booking, mode: "local" };
  }

  if (payload.action === "updateStatus") {
    bookings = bookings.map(booking =>
      booking.id === payload.id
        ? {
            ...booking,
            status: payload.status,
            paymentStatus: payload.status === "ชำระแล้ว" || payload.status === "ยืนยันแล้ว"
              ? "ชำระแล้ว"
              : (payload.status === "ยกเลิก" ? "ยกเลิก" : booking.paymentStatus)
          }
        : booking
    );
    localSaveBookings(bookings);
    return { ok: true, mode: "local" };
  }

  if (payload.action === "verifySlip") {
    return {
      ok: false,
      message: "การตรวจสลิปใช้ได้เมื่อเชื่อม Supabase และ Edge Function แล้วเท่านั้น"
    };
  }

  if (payload.action === "precheckSlip") {
    return {
      ok: false,
      message: "การตรวจสลิปอัตโนมัติใช้ได้เมื่อเชื่อม Supabase และ Edge Function แล้วเท่านั้น"
    };
  }

  if (payload.action === "delete") {
    bookings = bookings.filter(booking => booking.id !== payload.id);
    localSaveBookings(bookings);
    return { ok: true, mode: "local" };
  }

  return { ok: false, message: "ไม่พบ action" };
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function dateDiffNights(start, end) {
  if (!start || !end) return 0;
  const inDate = new Date(start);
  const outDate = new Date(end);
  const diff = (outDate - inDate) / (1000 * 60 * 60 * 24);
  return Math.max(0, diff);
}

function normalizeSettings(settings) {
  const merged = {
    ...clone(DEFAULT_SETTINGS),
    ...(settings || {})
  };
  merged.addons = {
    label: merged.addons?.label || "บริการเสริม",
    items: normalizeAddonItems(merged.addons?.items, merged)
  };
  const mookata = merged.addons.items.find(item => item.id === "mookata");
  const extraBed = merged.addons.items.find(item => item.id === "extra_bed");
  merged.mookata = { ...(merged.mookata || {}), price: Number(mookata?.price || 0) };
  merged.extraBed = { ...(merged.extraBed || {}), price: Number(extraBed?.price || 0) };
  if (mookata) merged.mookata.label = mookata.name;
  if (extraBed) merged.extraBed.label = extraBed.name;
  merged.bookingFee = {
    label: merged.bookingFee?.label || "ค่าจอง",
    value: getSettingsBookingFee(merged)
  };
  merged.creditPerBooking = {
    label: merged.creditPerBooking?.label || "เครดิตที่ใช้ต่อการจอง",
    value: getSettingsCreditPerBooking(merged)
  };
  merged.heroContent = normalizeHeroContent(merged.heroContent || {});
  return merged;
}

function normalizeRooms(rooms) {
  const data = Array.isArray(rooms) && rooms.length ? rooms : clone(DEFAULT_ROOMS);
  return data.map(room => {
    const galleryImages = normalizeGalleryImages(room);
    return {
      ...room,
      image: String(room.image || galleryImages[0] || "").trim(),
      galleryImages,
      price: Number(room.price || 0),
      closedUntil: String(room.closedUntil || "").trim(),
      active: room.active === true || room.active === "TRUE" || room.active === "true" || room.active === 1
    };
  });
}
