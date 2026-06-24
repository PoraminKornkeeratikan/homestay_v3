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
    const room = {
      ...payloadRoom,
      image: payloadRoom.image || (payloadRoom.imageUpload ? `data:${payloadRoom.imageUpload.mimeType};base64,${payloadRoom.imageUpload.base64}` : ""),
      imageUpload: undefined,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      active: true,
      createdAt: new Date().toISOString()
    };
    rooms.push(room);
    localSaveRooms(rooms);
    return { ok: true, data: room, mode: "local" };
  }

  if (payload.action === "updateRoom") {
    rooms = rooms.map(room => room.id === payload.id ? { ...room, ...(payload.room || {}) } : room);
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
  return data.map(room => ({
    ...room,
    price: Number(room.price || 0),
    active: room.active === true || room.active === "TRUE" || room.active === "true" || room.active === 1
  }));
}
