let settings = normalizeSettings(DEFAULT_SETTINGS);
let rooms = normalizeRooms(DEFAULT_ROOMS);
let bookings = [];
let selectedAddonQty = {};
let selectedRoomId = "";
let calendarDate = new Date();
let pendingBooking = null;

const roomGrid = document.getElementById("roomGrid");
const roomType = document.getElementById("roomType");
const bookingForm = document.getElementById("bookingForm");
const checkIn = document.getElementById("checkIn");
const checkOut = document.getElementById("checkOut");
const syncStatus = document.getElementById("syncStatus");
const submitBookingBtn = document.getElementById("submitBookingBtn");
const bookingPanel = document.getElementById("bookingPanel");
const selectedRoomNameText = document.getElementById("selectedRoomNameText");
const changeRoomBtn = document.getElementById("changeRoomBtn");
const selectedCheckInText = document.getElementById("selectedCheckInText");
const selectedCheckOutText = document.getElementById("selectedCheckOutText");
const selectedNightsText = document.getElementById("selectedNightsText");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarMonthText = document.getElementById("calendarMonthText");
const calendarGrid = document.getElementById("calendarGrid");

const addonGrid = document.getElementById("addonGrid");
const roomTotalText = document.getElementById("roomTotalText");
const addonTotalText = document.getElementById("addonTotalText");
const grandTotalText = document.getElementById("grandTotalText");
const bookingFeeText = document.getElementById("bookingFeeText");

const bankNameText = document.getElementById("bankNameText");
const bankAccountNameText = document.getElementById("bankAccountNameText");
const bankAccountNumberText = document.getElementById("bankAccountNumberText");
const qrPaymentBox = document.getElementById("qrPaymentBox");
const qrCodeImage = document.getElementById("qrCodeImage");
const qrAmountText = document.getElementById("qrAmountText");
const downloadQrBtn = document.getElementById("downloadQrBtn");
const pageLinkBtn = document.getElementById("pageLinkBtn");
const gpsLinkBtn = document.getElementById("gpsLinkBtn");
const copyAccountBtn = document.getElementById("copyAccountBtn");
const paymentHelpText = document.getElementById("paymentHelpText");
const transferSlip = document.getElementById("transferSlip");
const slipDropzone = document.getElementById("slipDropzone");
const slipFileName = document.getElementById("slipFileName");
const slipPreview = document.getElementById("slipPreview");
const slipPreviewThumb = document.getElementById("slipPreviewThumb");
const slipPreviewImage = document.getElementById("slipPreviewImage");
const slipPreviewName = document.getElementById("slipPreviewName");
const slipPreviewSize = document.getElementById("slipPreviewSize");
const clearSlipBtn = document.getElementById("clearSlipBtn");

const policyModal = document.getElementById("policyModal");
const policyContent = document.getElementById("policyContent");
const acceptPolicyBtn = document.getElementById("acceptPolicyBtn");

const bookingConfirmModal = document.getElementById("bookingConfirmModal");
const ticketBookingCode = document.getElementById("ticketBookingCode");
const ticketDetails = document.getElementById("ticketDetails");
const confirmSendBookingBtn = document.getElementById("confirmSendBookingBtn");
const backToEditBtn = document.getElementById("backToEditBtn");

const historyForm = document.getElementById("historyForm");
const historyBookingCode = document.getElementById("historyBookingCode");
const historyResult = document.getElementById("historyResult");

function formatMultiline(value) {
  return escapeHtml(value || "").replace(/\r?\n/g, "<br>");
}


function ensureLoadingPopup() {
  let popup = document.getElementById("appLoadingPopup");

  if (popup) return popup;

  popup = document.createElement("div");
  popup.id = "appLoadingPopup";
  popup.className = "loading-popup hidden";
  popup.innerHTML = `
    <div class="loading-card">
      <div class="loading-spinner" aria-hidden="true"></div>
      <h3 id="loadingPopupTitle">กำลังโหลดข้อมูล</h3>
      <p id="loadingPopupText">กรุณารอสักครู่ ระบบกำลังเชื่อมต่อข้อมูล</p>
    </div>
  `;

  document.body.appendChild(popup);
  return popup;
}

function showLoadingPopup(text = "กรุณารอสักครู่ ระบบกำลังเชื่อมต่อข้อมูล") {
  const popup = ensureLoadingPopup();
  const message = document.getElementById("loadingPopupText");

  if (message) message.textContent = text;
  popup.classList.remove("hidden");
  document.body.classList.add("is-loading-popup");
}

function hideLoadingPopup() {
  const popup = document.getElementById("appLoadingPopup");

  if (!popup) return;

  popup.classList.add("hidden");
  document.body.classList.remove("is-loading-popup");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRoomDetailText(detail, roomName = "") {
  let text = String(detail || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!text) return "";

  text = text.replace(/^รายละเอียด\s*🏠?\s*/i, "").trim();

  if (roomName) {
    const namePattern = new RegExp("^" + escapeRegExp(roomName) + "\\s*", "i");
    text = text.replace(namePattern, "").trim();
  }

  return text;
}

function renderRoomDetail(detail, roomName = "", roomId = "") {
  let text = String(detail || "ห้องพักของโฮมสเตย์")
    .replace(/\\n/g, "\n")
    .trim();

  if (roomName) {
    const namePattern = new RegExp("^" + escapeRegExp(roomName) + "\\s*", "i");
    text = text.replace(namePattern, "").trim();
  }

  const safeId = escapeHtml(roomId || roomName).replace(/\s+/g, "_");
  return `
    <button type="button" class="detail-toggle-btn" onclick="openRoomDetailModal('${safeId}')">
      ดูรายละเอียด
    </button>`;
}

function toggleRoomDetail(safeId) {
  const el = document.getElementById("detail_" + safeId);
  if (!el) return;
  el.classList.toggle("hidden");
  // update button text
  const btn = el.previousElementSibling;
  if (btn) {
    btn.textContent = el.classList.contains("hidden")
      ? "ℹ️ ดูรายละเอียดห้องพัก"
      : "✕ ซ่อนรายละเอียด";
  }
}

function roomSafeId(room = {}) {
  return escapeHtml(room.id || room.name || "").replace(/\s+/g, "_");
}

function getRoomGalleryImages(room = {}) {
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

function ensureRoomDetailModal() {
  let modal = document.getElementById("roomDetailModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "roomDetailModal";
  modal.className = "modal-overlay room-detail-modal hidden";
  modal.innerHTML = `
    <div class="modal-card room-detail-modal-card">
      <div class="modal-head">
        <div>
          <span class="pill">รายละเอียดห้องพัก</span>
          <h3 id="roomDetailModalTitle">-</h3>
        </div>
        <button type="button" class="modal-close-btn" onclick="closeRoomDetailModal()" aria-label="ปิด">×</button>
      </div>
      <div class="room-detail-gallery" id="roomDetailGallery"></div>
      <div class="room-detail-modal-text" id="roomDetailModalText"></div>
      <div class="modal-actions room-detail-modal-actions">
        <button type="button" class="ghost-btn" onclick="closeRoomDetailModal()">ปิด</button>
        <button type="button" id="roomDetailBookBtn">จองห้องนี้</button>
      </div>
    </div>`;

  modal.addEventListener("click", event => {
    if (event.target.id === "roomDetailModal") closeRoomDetailModal();
  });
  document.body.appendChild(modal);
  return modal;
}

function openRoomDetailModal(safeId) {
  const room = activeRooms().find(item => roomSafeId(item) === safeId);
  if (!room) return;

  const modal = ensureRoomDetailModal();
  const images = getRoomGalleryImages(room);
  const detail = normalizeRoomDetailText(room.detail || "", room.name) || "ห้องพักของโฮมสเตย์";

  document.getElementById("roomDetailModalTitle").textContent = room.name;
  document.getElementById("roomDetailModalText").innerHTML = escapeHtml(detail).replace(/\r?\n/g, "<br>");
  document.getElementById("roomDetailGallery").innerHTML = images.length
    ? images.map((image, index) => `
        <figure class="room-detail-gallery-item">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(room.name)} ${index + 1}" loading="lazy" referrerpolicy="no-referrer" />
        </figure>
      `).join("")
    : `<div class="room-detail-gallery-empty">ยังไม่มีรูปเพิ่มเติม</div>`;

  document.getElementById("roomDetailBookBtn").onclick = () => {
    closeRoomDetailModal();
    selectRoom(room.id);
  };

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeRoomDetailModal() {
  const modal = document.getElementById("roomDetailModal");
  if (modal) modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeRoomDetailModal();
});

function renderImageBlock(imageUrl, altText, className = "room-img") {
  const url = String(imageUrl || "").trim();
  const safeAlt = escapeHtml(altText || "รูปห้องพัก");

  if (!url) {
    return `<div class="${className} image-missing"><span>ไม่มีรูปภาพ</span></div>`;
  }

  return `
    <div class="${className}">
      <img src="${escapeHtml(url)}" alt="${safeAlt}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('image-missing'); this.remove();" />
      <span>รูปไม่แสดง</span>
    </div>
  `;
}

function setSyncStatus(type, text) {
  syncStatus.className = "sync-status";
  if (type) syncStatus.classList.add(type);
  syncStatus.textContent = text;
}

function activeRooms() {
  const todayKey = toDateKey(new Date());
  return rooms.filter(room => isRoomOpenOnDate(room, todayKey));
}

function selectedRoom() {
  return activeRooms().find(room => room.id === selectedRoomId) || activeRooms()[0] || null;
}

function getRoomDiscountPrice(room = {}) {
  const normalPrice = Number(room.price || 0);
  const discountPrice = Math.max(0, Number(room.discountPrice ?? room.discount_price ?? 0));
  return discountPrice > 0 && discountPrice < normalPrice ? discountPrice : 0;
}

function getRoomSalePrice(room = {}) {
  return getRoomDiscountPrice(room) || Number(room.price || 0);
}

function getRoomDiscountPercent(room = {}) {
  const normalPrice = Number(room.price || 0);
  const discountPrice = getRoomDiscountPrice(room);
  if (!normalPrice || !discountPrice) return 0;
  return Math.max(1, Math.round(((normalPrice - discountPrice) / normalPrice) * 100));
}

function renderRoomPrice(room = {}) {
  const discountPrice = getRoomDiscountPrice(room);
  if (!discountPrice) {
    return `<span class="price">${formatMoney(room.price)}</span>`;
  }

  return `
    <div class="room-sale-price">
      <div class="room-original-price">
        <span>${formatMoney(room.price)}</span>
        <b>-${getRoomDiscountPercent(room)}%</b>
      </div>
      <span class="price room-discount-price">${formatMoney(discountPrice)}</span>
    </div>
  `;
}

function isRoomOpenOnDate(room, dateKey) {
  if (!room) return false;
  if (room.active) return true;

  const closedUntil = String(room.closedUntil || "").trim();
  if (!closedUntil) return false;

  return String(dateKey || toDateKey(new Date())) > closedUntil;
}

async function loadBootstrap() {
  showLoadingPopup("กำลังโหลดห้องพัก ราคา และข้อมูลการจอง");

  try {
    const result = await apiRequest({ action: "bootstrap" });
    if (!result.ok) throw new Error(result.message || "โหลดข้อมูลไม่สำเร็จ");

    const payload = result.data || result;
    rooms = normalizeRooms(payload.rooms || result.rooms);
    bookings = Array.isArray(payload.bookings) ? payload.bookings : [];
    settings = normalizeSettings(payload.settings || result.settings);

    renderRooms();
    renderSettings();
    showPolicyModal();

    if (isGoogleSheetReady) {
      setSyncStatus("connected", "กำลังใช้งาน");
    } else {
      setSyncStatus("", "โหมดทดลองในเครื่อง ยังไม่ได้ใส่ Google Script URL");
    }
  } catch (error) {
    console.error(error);
    setSyncStatus("error", "โหลดข้อมูลจาก Google Sheet ไม่สำเร็จ");
    showToast("โหลดข้อมูลไม่สำเร็จ ใช้ข้อมูลเริ่มต้นก่อน");
    renderRooms();
    renderSettings();
    showPolicyModal();
  } finally {
    setTimeout(hideLoadingPopup, 350);
  }
}

function renderRooms() {
  // เช็คสถานะระบบก่อน
  if (!isSystemActive()) {
    roomGrid.innerHTML = `
      <div class="system-inactive-banner full">
        <div class="inactive-icon">🔒</div>
        <h3>หยุดใช้งานชั่วคราวค่ะ</h3>
        <p>ขออภัยในความไม่สะดวก ขณะนี้ระบบจองห้องพักหยุดให้บริการชั่วคราว<br>กรุณาติดต่อเจ้าหน้าที่เพื่อสอบถามข้อมูลเพิ่มเติม</p>
      </div>`;
    roomType.value = "";
    updateSummary();
    return;
  }

  const available = activeRooms();

  if (!available.length) {
    roomGrid.innerHTML = `<div class="empty full">ยังไม่มีห้องพักที่เปิดให้จอง</div>`;
    roomType.value = "";
    updateSummary();
    return;
  }

  roomGrid.innerHTML = available.map(room => `
    <article class="room-card">
      ${renderImageBlock(room.image, room.name, "room-img")}
      <h4>${escapeHtml(room.name)}</h4>
      <div class="room-meta">
        ${renderRoomPrice(room)}
        <div class="customer-room-actions">
          ${renderRoomDetail(room.detail || "ห้องพักของโฮมสเตย์", room.name, room.id)}
          <button type="button" class="book-room-btn" onclick="selectRoom('${room.id}')">จองห้องนี้</button>
        </div>
      </div>
    </article>
  `).join("");

  updateSummary();
}

function selectRoom(roomId) {
  selectedRoomId = roomId;
  roomType.value = roomId;
  const room = selectedRoom();
  selectedRoomNameText.textContent = room ? `${room.name} • ${formatMoney(getRoomSalePrice(room))} / คืน` : "-";

  bookingPanel.classList.remove("hidden");
  resetSelectedDates();

  const today = new Date();
  calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
  updateSummary();

  bookingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setMinDates() {
  checkIn.value = "";
  checkOut.value = "";
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysKey(value, days) {
  const date = fromDateKey(value);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function formatThaiDate(value) {
  if (!value) return "ยังไม่เลือก";
  const date = fromDateKey(value);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isCancelledBooking(booking) {
  const status = String(booking.status || "").trim().toLowerCase();
  const paymentStatus = String(booking.paymentStatus || "").trim().toLowerCase();
  return status.includes("ยกเลิก") || paymentStatus.includes("ยกเลิก") || status.includes("cancel") || paymentStatus.includes("cancel");
}

function getBookedDateSet(roomId) {
  const booked = new Set();

  bookings
    .filter(booking => {
      const sameRoom = String(booking.roomId) === String(roomId);
      const activeBooking = !isCancelledBooking(booking);
      return sameRoom && activeBooking && booking.checkIn && booking.checkOut;
    })
    .forEach(booking => {
      const start = fromDateKey(booking.checkIn);
      const end = fromDateKey(booking.checkOut);

      for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
        booked.add(toDateKey(date));
      }
    });

  return booked;
}

function isPastDate(date) {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date < current;
}

function hasBookedInRange(startKey, endKey) {
  if (!startKey || !endKey) return false;

  const booked = getBookedDateSet(selectedRoomId);
  const room = rooms.find(item => String(item.id) === String(selectedRoomId));
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);

  for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
    const key = toDateKey(date);
    if (booked.has(key) || !isRoomOpenOnDate(room, key)) return true;
  }

  return false;
}

function resetSelectedDates() {
  checkIn.value = "";
  checkOut.value = "";
  updateDateSummary();
}

function updateDateSummary() {
  selectedCheckInText.textContent = formatThaiDate(checkIn.value);
  selectedCheckOutText.textContent = formatThaiDate(checkOut.value);
  selectedNightsText.textContent = `${dateDiffNights(checkIn.value, checkOut.value)} คืน`;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const booked = getBookedDateSet(selectedRoomId);
  const room = rooms.find(item => String(item.id) === String(selectedRoomId));

  calendarMonthText.textContent = firstDay.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric"
  });

  const cells = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    cells.push(`<button type="button" class="calendar-day blank"></button>`);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    const past = isPastDate(date);
    const isBooked = booked.has(key);
    const isClosed = !isRoomOpenOnDate(room, key);
    const isAvailable = !past && !isBooked && !isClosed;

    let classes = ["calendar-day"];
    if (past) classes.push("past");
    if (isBooked || isClosed) classes.push("booked");
    if (isAvailable) classes.push("available");

    const inRange = checkIn.value && checkOut.value && key > checkIn.value && key < checkOut.value;
    if (key === checkIn.value) classes.push("selected-start");
    if (key === checkOut.value) classes.push("selected-end");
    if (inRange) classes.push("in-range");

    const badge = (isBooked || isClosed) ? "ไม่ว่าง" : (isAvailable ? "ว่าง" : "");

    cells.push(`
      <button
        type="button"
        class="${classes.join(" ")}"
        ${isAvailable ? `onclick="selectCalendarDate('${key}')"` : "disabled"}
      >
        ${day}
        ${badge ? `<span class="badge">${badge}</span>` : ""}
      </button>
    `);
  }

  calendarGrid.innerHTML = cells.join("");
  updateDateSummary();
}

function selectCalendarDate(dateKey) {
  const checkoutKey = addDaysKey(dateKey, 1);

  checkIn.value = dateKey;
  checkOut.value = checkoutKey;

  if (hasBookedInRange(checkIn.value, checkOut.value)) {
    showToast("วันดังกล่าวไม่ว่าง กรุณาเลือกวันอื่น");
    checkIn.value = "";
    checkOut.value = "";
  } else {
    showToast(`เลือกเช็กอิน ${formatThaiDate(dateKey)} ระบบตั้งเช็กเอาต์เป็น ${formatThaiDate(checkoutKey)}`);
  }

  renderCalendar();
  updateSummary();
}

function getActiveAddonSettings() {
  return normalizeAddonItems(settings.addons?.items, settings).filter(item => item.active !== false);
}

function renderAddonChoices() {
  if (!addonGrid) return;
  const items = getActiveAddonSettings();

  if (!items.length) {
    addonGrid.innerHTML = `<div class="empty full">ยังไม่มีบริการเสริม</div>`;
    return;
  }

  addonGrid.innerHTML = items.map(item => {
    const qty = Math.max(1, Number(selectedAddonQty[item.id] || 1));
    return `
      <label class="addon-card" for="addon_${escapeHtml(item.id)}">
        <div class="addon-left">
          <input type="checkbox" id="addon_${escapeHtml(item.id)}" data-addon-check="${escapeHtml(item.id)}" />
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${formatMoney(item.price)} / ${escapeHtml(item.unit || "รายการ")}</span>
          </div>
        </div>
        <div class="qty-control" aria-label="จำนวน ${escapeHtml(item.name)}">
          <button type="button" data-addon-minus="${escapeHtml(item.id)}">−</button>
          <b data-addon-qty="${escapeHtml(item.id)}">${qty}</b>
          <button type="button" data-addon-plus="${escapeHtml(item.id)}">+</button>
        </div>
      </label>
    `;
  }).join("");
}

function getSelectedAddonItems() {
  return getActiveAddonSettings()
    .map(item => {
      const checked = addonGrid?.querySelector(`[data-addon-check="${CSS.escape(item.id)}"]`)?.checked;
      const qty = checked ? Math.max(1, Number(selectedAddonQty[item.id] || 1)) : 0;
      return {
        id: item.id,
        name: item.name,
        unit: item.unit || "รายการ",
        qty,
        price: Number(item.price || 0),
        total: qty * Number(item.price || 0)
      };
    })
    .filter(item => item.qty > 0);
}

function getBookingAddonItems(booking = {}) {
  const items = normalizeBookingAddonItems(booking.addonItems);
  if (items.length) return items;

  const fallback = [];
  if (Number(booking.mookataQty || 0) > 0) {
    fallback.push({
      id: "mookata",
      name: "หมูกระทะ",
      unit: "ชุด",
      qty: Number(booking.mookataQty || 0),
      price: Number(booking.mookataPrice || 0),
      total: Number(booking.mookataQty || 0) * Number(booking.mookataPrice || 0)
    });
  }
  if (Number(booking.extraBedQty || 0) > 0) {
    fallback.push({
      id: "extra_bed",
      name: "เตียงเสริม",
      unit: "เตียง",
      qty: Number(booking.extraBedQty || 0),
      price: Number(booking.extraBedPrice || 0),
      total: Number(booking.extraBedQty || 0) * Number(booking.extraBedPrice || 0)
    });
  }
  return fallback;
}

function formatAddonItems(items = []) {
  const lines = normalizeBookingAddonItems(items).map(item => {
    const qtyText = Number(item.qty || 0) > 1 ? ` ${item.qty} ${item.unit || "รายการ"}` : "";
    return `${item.name}${qtyText} ${formatMoney(item.total || item.qty * item.price)}`;
  });
  return lines.length ? lines.join(", ") : "ไม่มี";
}

function renderSettings() {
  applyBrandAssets(settings);
  renderAddonChoices();

  bankNameText.textContent = settings.bankName.value || "-";
  bankAccountNameText.textContent = settings.bankAccountName.value || "-";
  bankAccountNumberText.textContent = settings.bankAccountNumber.value || "-";
  if (paymentHelpText) {
    paymentHelpText.innerHTML = formatMultiline(
      settings.paymentNote?.value || "หลังโอนเงิน: กรุณาแนบสลิปการโอนเงินก่อนส่งคำขอจอง หากไม่แนบสลิป ระบบจะไม่ให้ส่งจอง"
    );
  }

  setupHeroLink(pageLinkBtn, settings.pageUrl?.value);
  setupHeroLink(gpsLinkBtn, settings.gpsUrl?.value);

  updateSummary();
}

function setupHeroLink(element, url) {
  const cleanUrl = String(url || "").trim();

  if (!element) return;

  if (cleanUrl) {
    element.href = cleanUrl;
    element.classList.remove("hidden");
  } else {
    element.href = "#";
    element.classList.add("hidden");
  }
}

function setupPaymentQr(amount = 0) {
  const cleanUrl = getPaymentQrImageUrl(settings, amount, 260);

  if (!qrPaymentBox || !qrCodeImage) return;

  if (cleanUrl) {
    qrCodeImage.src = cleanUrl;
    qrPaymentBox.classList.remove("hidden");
    if (qrAmountText) qrAmountText.textContent = `ยอดชำระ ${formatMoney(amount)}`;
  } else {
    qrCodeImage.removeAttribute("src");
    qrPaymentBox.classList.add("hidden");
    if (qrAmountText) qrAmountText.textContent = "";
  }
}

async function downloadQrCode() {
  const url = qrCodeImage?.src || "";

  if (!url) {
    showToast("ยังไม่มี QR-code ให้บันทึก");
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("โหลด QR-code ไม่สำเร็จ");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "homestay-qr-code.png";
    link.click();
    URL.revokeObjectURL(objectUrl);
    showToast("บันทึก QR-code แล้ว");
  } catch (error) {
    window.open(url, "_blank", "noopener");
    showToast("เปิด QR-code แล้ว กดบันทึกรูปจากหน้าที่เปิดได้เลย");
  }
}

function showPolicyModal() {
  const policy = settings.propertyPolicy?.value || DEFAULT_SETTINGS.propertyPolicy.value || "กรุณาปฏิบัติตามนโยบายที่พัก";
  const formattedPolicy = escapeHtml(policy)
    .replace(/\\n/g, "\n")
    .replace(/\r?\n/g, "<br>");
  policyContent.innerHTML = formattedPolicy;
  policyModal.classList.remove("hidden");
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";

  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function updateSlipPreview() {
  const file = transferSlip.files && transferSlip.files[0];

  if (!file) {
    slipDropzone.classList.remove("has-file");
    slipPreview.classList.add("hidden");
    slipFileName.textContent = "ยังไม่ได้เลือกไฟล์";
    slipPreviewImage.src = "";
    slipPreviewThumb.className = "slip-preview-thumb";
    return;
  }

  slipDropzone.classList.add("has-file");
  slipPreview.classList.remove("hidden");
  slipFileName.textContent = "แนบแล้ว";
  slipPreviewName.textContent = file.name;
  slipPreviewSize.textContent = `${file.type || "ไฟล์"} • ${formatFileSize(file.size)}`;

  slipPreviewThumb.className = "slip-preview-thumb";
  slipPreviewImage.src = "";

  if (file.type.startsWith("image/")) {
    slipPreviewThumb.classList.add("image");
    slipPreviewImage.src = URL.createObjectURL(file);
  } else {
    slipPreviewThumb.classList.add("pdf");
  }
}

function clearSlipFile() {
  transferSlip.value = "";
  updateSlipPreview();
  showToast("ล้างไฟล์สลิปแล้ว เลือกไฟล์ใหม่ได้เลย");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("อ่านไฟล์สลิปไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

async function copyBankAccount() {
  const accountNumber = (settings.bankAccountNumber.value || "").trim();

  if (!accountNumber) {
    showToast("ยังไม่มีเลขบัญชีให้คัดลอก");
    return;
  }

  try {
    await navigator.clipboard.writeText(accountNumber);
    showToast("คัดลอกเลขบัญชีแล้ว");
  } catch (error) {
    const tempInput = document.createElement("input");
    tempInput.value = accountNumber;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    tempInput.remove();
    showToast("คัดลอกเลขบัญชีแล้ว");
  }
}

function getSummary() {
  const room = selectedRoom() || { price: 0, name: "" };
  const nights = dateDiffNights(checkIn.value, checkOut.value);
  const roomTotal = getRoomSalePrice(room) * nights;

  const addonItems = getSelectedAddonItems();
  const selectedMookata = addonItems.find(item => item.id === "mookata");
  const selectedExtraBed = addonItems.find(item => item.id === "extra_bed");
  const selectedMookataQty = Number(selectedMookata?.qty || 0);
  const mookataTotal = Number(selectedMookata?.total || 0);
  const extraBedQty = Number(selectedExtraBed?.qty || 0);
  const extraBedTotal = Number(selectedExtraBed?.total || 0);
  const addonTotal = addonItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const bookingFee = getSettingsBookingFee(settings);
  const grandTotal = roomTotal + addonTotal + bookingFee;

  return {
    room,
    nights,
    roomTotal,
    selectedMookataQty,
    mookataTotal,
    extraBedQty,
    extraBedTotal,
    addonItems,
    addonTotal,
    bookingFee,
    grandTotal
  };
}

function updateSummary() {
  const summary = getSummary();

  roomTotalText.textContent = formatMoney(summary.roomTotal);
  addonTotalText.textContent = formatMoney(summary.addonTotal);
  bookingFeeText.textContent = formatMoney(summary.bookingFee);
  grandTotalText.textContent = formatMoney(summary.grandTotal);
  setupPaymentQr(summary.grandTotal);

  summary.addonItems.forEach(item => {
    const qtyText = addonGrid?.querySelector(`[data-addon-qty="${CSS.escape(item.id)}"]`);
    if (qtyText) qtyText.textContent = item.qty;
  });
  updateDateSummary();
}

function generateBookingCode() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `GS${datePart}-${randomPart}`;
}

async function buildBookingObject() {
  const summary = getSummary();

  if (!summary.room || !summary.room.id) {
    throw new Error("ยังไม่มีห้องพักให้จอง");
  }

  if (summary.nights <= 0) {
    throw new Error("กรุณาเลือกวันที่เช็กอิน");
  }

  if (hasBookedInRange(checkIn.value, checkOut.value)) {
    throw new Error("ช่วงวันที่เลือกมีวันที่ไม่ว่าง กรุณาเลือกใหม่");
  }

  const name = document.getElementById("guestName").value.trim();
  const phone = document.getElementById("guestPhone").value.trim();
  const email = document.getElementById("guestEmail").value.trim();

  if (!name) throw new Error("กรุณากรอกชื่อผู้จอง");

  if (!/^[0-9+\-\s]{9,15}$/.test(phone)) {
    throw new Error("กรุณากรอกเบอร์โทรให้ถูกต้อง");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("กรุณากรอกอีเมลให้ถูกต้อง");
  }

  const slipFile = transferSlip.files && transferSlip.files[0];

  if (!slipFile) {
    throw new Error("กรุณาแนบสลิปการโอนเงินก่อนส่งจอง");
  }

  const maxSlipSize = 5 * 1024 * 1024;
  if (slipFile.size > maxSlipSize) {
    throw new Error("ไฟล์สลิปต้องไม่เกิน 5MB");
  }

  const allowedSlip = slipFile.type.startsWith("image/");
  if (!allowedSlip) {
    throw new Error("สลิปต้องเป็นไฟล์รูปภาพ JPG, PNG หรือ WEBP");
  }

  const slipBase64 = await fileToBase64(slipFile);

  return {
    bookingCode: generateBookingCode(),
    name,
    phone,
    email,
    roomId: summary.room.id,
    roomName: summary.room.name,
    roomPrice: getRoomSalePrice(summary.room),
    checkIn: checkIn.value,
    checkOut: checkOut.value,
    nights: summary.nights,
    guestCount: document.getElementById("guestCount").value,
    mookataQty: summary.selectedMookataQty,
    mookataPrice: Number(summary.addonItems.find(item => item.id === "mookata")?.price || settings.mookata.price || 0),
    extraBedQty: summary.extraBedQty,
    extraBedPrice: Number(summary.addonItems.find(item => item.id === "extra_bed")?.price || settings.extraBed.price || 0),
    addonItems: summary.addonItems,
    addonTotal: summary.addonTotal,
    roomTotal: summary.roomTotal,
    bookingFee: summary.bookingFee,
    grandTotal: summary.grandTotal,
    paymentMethod: "โอนผ่านบัญชีธนาคาร",
    paymentStatus: "รอชำระเงิน",
    slipFileName: slipFile.name,
    slipMimeType: slipFile.type,
    slipBase64,
    bankName: settings.bankName.value || "",
    bankAccountName: settings.bankAccountName.value || "",
    bankAccountNumber: settings.bankAccountNumber.value || "",
    promptpayId: settings.promptPayId?.value || "",
    note: document.getElementById("note").value.trim(),
    status: "รอชำระเงิน"
  };
}

function renderTicket(booking) {
  ticketBookingCode.textContent = booking.bookingCode;

  const addonText = formatAddonItems(getBookingAddonItems(booking));

  const rows = [
    ["ชื่อผู้จอง", booking.name],
    ["เบอร์โทร", booking.phone],
    ["อีเมล", booking.email],
    ["ห้องพัก", booking.roomName],
    ["เช็กอิน", formatThaiDate(booking.checkIn)],
    ["เช็กเอาต์", formatThaiDate(booking.checkOut)],
    ["จำนวนคืน", `${booking.nights} คืน`],
    ["ผู้เข้าพัก", `${booking.guestCount} คน`],
    ["บริการเสริม", addonText],
    ["ค่าห้อง", formatMoney(booking.roomTotal)],
    ["บริการเสริม", formatMoney(booking.addonTotal)],
    ["ค่าจอง", formatMoney(booking.bookingFee)],
    ["ยอดที่ชำระ", formatMoney(booking.grandTotal)],
    ["สถานะ", booking.status],
    ["สลิป", booking.slipFileName]
  ];

  ticketDetails.innerHTML = rows.map(([label, value]) => `
    <div>
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
    </div>
  `).join("");

  confirmSendBookingBtn.disabled = false;
  bookingConfirmModal.classList.remove("hidden");
}

async function createBooking(event) {
  event.preventDefault();

  submitBookingBtn.disabled = true;
  submitBookingBtn.textContent = "กำลังตรวจข้อมูล...";

  try {
    pendingBooking = await buildBookingObject();
    renderTicket(pendingBooking);
  } catch (error) {
    showToast(error.message || "ข้อมูลไม่ครบถ้วน");
  } finally {
    submitBookingBtn.disabled = false;
    submitBookingBtn.textContent = "ส่งคำขอจอง";
  }
}

function downloadTicketImage(booking) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1120;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f4fbf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f3d2e";
  ctx.fillRect(0, 0, canvas.width, 150);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(getSiteName(settings), 54, 70);
  ctx.font = "24px sans-serif";
  ctx.fillText("หลักฐานการจองสำหรับยื่นตอนเข้าพัก", 54, 112);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#dcebe3";
  ctx.lineWidth = 2;
  roundRect(ctx, 54, 190, 792, 850, 28, true, true);

  ctx.fillStyle = "#14533f";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("เลขรายการจอง", 94, 250);

  ctx.fillStyle = "#0f3d2e";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText(booking.bookingCode, 94, 305);

  const lines = [
    ["ชื่อผู้จอง", booking.name],
    ["เบอร์โทร", booking.phone],
    ["อีเมล", booking.email],
    ["ห้องพัก", booking.roomName],
    ["เช็กอิน", formatThaiDate(booking.checkIn)],
    ["เช็กเอาต์", formatThaiDate(booking.checkOut)],
    ["จำนวนคืน", `${booking.nights} คืน`],
    ["ผู้เข้าพัก", `${booking.guestCount} คน`],
    ["ยอดที่ชำระ", formatMoney(booking.grandTotal)],
    ["สถานะ", "รอชำระเงิน / รอแอดมินตรวจสอบ"]
  ];

  let y = 375;
  lines.forEach(([label, value]) => {
    ctx.fillStyle = "#6b7d73";
    ctx.font = "22px sans-serif";
    ctx.fillText(label, 94, y);

    ctx.fillStyle = "#1d2b25";
    ctx.font = "bold 25px sans-serif";
    wrapText(ctx, String(value), 330, y, 450, 30);

    y += 66;
  });

  ctx.fillStyle = "#14533f";
  ctx.font = "bold 23px sans-serif";
  ctx.fillText("กรุณาแสดงภาพนี้ตอนเข้าพัก", 94, 995);

  const link = document.createElement("a");
  link.download = `${booking.bookingCode}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();

  showToast("บันทึกข้อมูลแล้ว");
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

async function confirmSendBooking() {
  if (!pendingBooking) {
    showToast("ไม่พบข้อมูลการจอง");
    return;
  }

  confirmSendBookingBtn.disabled = true;
  confirmSendBookingBtn.textContent = "กำลังจองที่พัก...";
  showLoadingPopup("กำลังจองที่พักให้");

  try {
    const verified = await apiRequest({
      action: "precheckSlip",
      slipBase64: pendingBooking.slipBase64,
      booking: pendingBooking
    });

    // ถ้า precheckSlip ไม่พร้อม (local mode หรือ Edge Function ยังไม่ตั้งค่า) ให้ข้ามได้
    if (verified.ok && verified.data) {
      const slipPassed = verified.data.passed === true || verified.data.slipVerifyStatus === "passed";
      pendingBooking = {
        ...pendingBooking,
        paymentStatus: slipPassed ? (verified.data.paymentStatus || "ชำระแล้ว") : "รอตรวจสอบสลิป",
        status: slipPassed ? (verified.data.status || "ชำระแล้ว") : "รอยืนยัน",
        slipVerifyStatus: verified.data.slipVerifyStatus || "not_checked",
        slipVerifyMessage: verified.data.slipVerifyMessage || verified.data.message || "",
        slipVerifiedAt: verified.data.slipVerifiedAt || new Date().toISOString(),
        slipTransferAmount: Number(verified.data.slipTransferAmount || pendingBooking.grandTotal || 0),
        slipTransferRef: verified.data.slipTransferRef || "",
        slipVerifyChecks: verified.data.slipVerifyChecks || null,
        slipRawResult: verified.data.slipRawResult || null
      };
    }

    confirmSendBookingBtn.textContent = "กำลังจองที่พัก...";
    const result = await apiRequest({ action: "create", booking: pendingBooking });
    if (!result.ok) throw new Error(result.message || "ส่งคำขอจองไม่สำเร็จ");

    bookings.unshift(result.data || {
      ...pendingBooking,
      id: pendingBooking.bookingCode,
      slipUrl: ""
    });

    // หักเครดิต
    if (result.mode !== "supabase" && (getPlanType() === "credit" || getPlanType() === "")) {
      setCredits(getCredits() - getSettingsCreditPerBooking(settings));
    }

    bookingConfirmModal.classList.add("hidden");
    showToast(`ส่งคำจองสำเร็จ เลขรายการจอง ${pendingBooking.bookingCode}`);

    bookingForm.reset();
    roomType.value = "";
    selectedRoomId = "";
    selectedAddonQty = {};
    setMinDates();
    resetSelectedDates();
    updateSlipPreview();
    bookingPanel.classList.add("hidden");
    renderRooms();
    renderAddonChoices();
    updateSummary();
    pendingBooking = null;
  } catch (error) {
    console.error(error);
    showToast(error?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
  } finally {
    hideLoadingPopup();
    confirmSendBookingBtn.disabled = false;
    confirmSendBookingBtn.textContent = "ยืนยันการจอง";
  }
}

function renderHistoryResult(booking) {
  if (!booking) {
    historyResult.classList.remove("hidden");
    historyResult.innerHTML = `<div class="empty">ไม่พบรายการจอง กรุณาตรวจเลขรายการจองอีกครั้ง</div>`;
    return;
  }

  const addonText = formatAddonItems(getBookingAddonItems(booking));

  historyResult.classList.remove("hidden");
  historyResult.innerHTML = `
    <div class="history-card">
      <div>
        <span>เลขรายการจอง</span>
        <strong>${escapeHtml(booking.bookingCode || booking.id)}</strong>
      </div>
      <div>
        <span>ผู้จอง</span>
        <strong>${escapeHtml(booking.name || "-")}</strong>
      </div>
      <div>
        <span>ห้องพัก</span>
        <strong>${escapeHtml(booking.roomName || "-")}</strong>
      </div>
      <div>
        <span>วันที่พัก</span>
        <strong>${escapeHtml(formatThaiDate(booking.checkIn))} → ${escapeHtml(formatThaiDate(booking.checkOut))}</strong>
      </div>
      <div>
        <span>บริการเสริม</span>
        <strong>${escapeHtml(addonText)}</strong>
      </div>
      <div>
        <span>ยอดชำระ</span>
        <strong>${formatMoney(booking.grandTotal || 0)}</strong>
      </div>
      <div>
        <span>สถานะ</span>
        <strong>${escapeHtml(booking.status || "-")}</strong>
      </div>
      <div>
        <span>สถานะชำระเงิน</span>
        <strong>${escapeHtml(booking.paymentStatus || "-")}</strong>
      </div>
    </div>
  `;
}

async function lookupBooking(event) {
  event.preventDefault();
  const code = historyBookingCode.value.trim();

  if (!code) {
    showToast("กรุณากรอกเลขรายการจอง");
    return;
  }

  try {
    const result = await apiRequest({ action: "lookupBooking", bookingCode: code });
    if (!result.ok) throw new Error(result.message || "ค้นหาไม่สำเร็จ");
    renderHistoryResult(result.data || null);
  } catch (error) {
    console.error(error);
    showToast("ค้นหาไม่สำเร็จ");
  }
}

addonGrid?.addEventListener("change", event => {
  const id = event.target?.dataset?.addonCheck;
  if (!id) return;
  selectedAddonQty[id] = Math.max(1, Number(selectedAddonQty[id] || 1));
  updateSummary();
});

addonGrid?.addEventListener("click", event => {
  const minusId = event.target?.dataset?.addonMinus;
  const plusId = event.target?.dataset?.addonPlus;
  const id = minusId || plusId;
  if (!id) return;

  selectedAddonQty[id] = Math.max(1, Number(selectedAddonQty[id] || 1) + (plusId ? 1 : -1));
  const checkbox = addonGrid.querySelector(`[data-addon-check="${CSS.escape(id)}"]`);
  if (checkbox) checkbox.checked = true;
  const qtyText = addonGrid.querySelector(`[data-addon-qty="${CSS.escape(id)}"]`);
  if (qtyText) qtyText.textContent = selectedAddonQty[id];
  updateSummary();
});

transferSlip.addEventListener("change", updateSlipPreview);
clearSlipBtn.addEventListener("click", clearSlipFile);

["dragenter", "dragover"].forEach(eventName => {
  slipDropzone.addEventListener(eventName, event => {
    event.preventDefault();
    slipDropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(eventName => {
  slipDropzone.addEventListener(eventName, event => {
    event.preventDefault();
    slipDropzone.classList.remove("dragging");
  });
});

slipDropzone.addEventListener("drop", event => {
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) return;

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  transferSlip.files = dataTransfer.files;
  updateSlipPreview();
});

copyAccountBtn.addEventListener("click", copyBankAccount);
downloadQrBtn?.addEventListener("click", downloadQrCode);
bookingForm.addEventListener("submit", createBooking);

prevMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

changeRoomBtn.addEventListener("click", () => {
  document.getElementById("rooms").scrollIntoView({ behavior: "smooth" });
});

acceptPolicyBtn.addEventListener("click", () => {
  policyModal.classList.add("hidden");
});

confirmSendBookingBtn.addEventListener("click", confirmSendBooking);
backToEditBtn.addEventListener("click", () => {
  bookingConfirmModal.classList.add("hidden");
  showToast("กลับไปแก้ข้อมูลได้เลย");
});

historyForm.addEventListener("submit", lookupBooking);

document.addEventListener("DOMContentLoaded", () => {
  applyBrandAssets(normalizeSettings(typeof localGetSettings === "function" ? localGetSettings() : DEFAULT_SETTINGS));
});

setMinDates();
loadBootstrap();
updateSummary();
