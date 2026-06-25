const LOCAL_BOOKING_KEY = "greenstay_bookings_backup_v3";
const LOCAL_ROOMS_KEY = "greenstay_rooms_backup_v3";
const LOCAL_SETTINGS_KEY = "greenstay_settings_backup_v3";
const isGoogleSheetReady = GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/");

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

function getSiteName(settings = {}) {
  return String(settings.siteName?.value || DEFAULT_SETTINGS.siteName?.value || "Wintery House").trim() || "Wintery House";
}

function getLogoUrl(settings = {}) {
  return String(settings.logoUrl?.value || DEFAULT_SETTINGS.logoUrl?.value || "LOGO.jpg").trim() || "LOGO.jpg";
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
      link.type = logoUrl.startsWith("data:image/") ? logoUrl.slice(5, logoUrl.indexOf(";")) : "image/jpeg";
    }
  });
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
  const promptPayId = String(settings.promptPayId?.value || settings.bankAccountNumber?.value || "").trim();
  return buildPromptPayPayload(promptPayId, amount) || buildTransferQrText(settings, amount);
}

function uploadsToImageUrls(uploads = []) {
  return (Array.isArray(uploads) ? uploads : [])
    .filter(upload => upload && upload.mimeType && upload.base64)
    .map(upload => `data:${upload.mimeType};base64,${upload.base64}`)
    .slice(0, 5);
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

async function localApiRequest(payload) {
  let bookings = localGetBookings();
  let rooms = localGetRooms();
  let settings = localGetSettings();

  if (payload.action === "bootstrap") {
    return { ok: true, data: { bookings, rooms, settings }, mode: "local" };
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

    settings = { ...settings, ...incomingSettings };
    localSaveSettings(settings);
    return { ok: true, data: settings, mode: "local" };
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
    return { ok: true, data: booking, mode: "local" };
  }

  if (payload.action === "updateStatus") {
    bookings = bookings.map(booking =>
      booking.id === payload.id ? { ...booking, status: payload.status } : booking
    );
    localSaveBookings(bookings);
    return { ok: true, mode: "local" };
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
  return {
    ...clone(DEFAULT_SETTINGS),
    ...(settings || {})
  };
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
