let cachedBookings = [];
let rooms = [];
let settings = normalizeSettings(DEFAULT_SETTINGS);
let adminCalendarDate = new Date();
let adminSelectedDateKey = "";

const adminLoginBox = document.getElementById("adminLoginBox");
const adminDashboard = document.getElementById("adminDashboard");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const adminPassword = document.getElementById("adminPassword");
const bookingTable = document.getElementById("bookingTable");
const roomTable = document.getElementById("roomTable");
const searchBooking = document.getElementById("searchBooking");
const statusFilter = document.getElementById("statusFilter");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const adminPrevMonthBtn = document.getElementById("adminPrevMonthBtn");
const adminNextMonthBtn = document.getElementById("adminNextMonthBtn");
const adminCalendarMonthText = document.getElementById("adminCalendarMonthText");
const adminCalendarGrid = document.getElementById("adminCalendarGrid");
const adminSelectedDateText = document.getElementById("adminSelectedDateText");
const adminDateDetailList = document.getElementById("adminDateDetailList");

const settingsForm = document.getElementById("settingsForm");
const settingMookataPrice = document.getElementById("settingMookataPrice");
const settingExtraBedPrice = document.getElementById("settingExtraBedPrice");
const settingBankName = document.getElementById("settingBankName");
const settingBankAccountName = document.getElementById("settingBankAccountName");
const settingBankAccountNumber = document.getElementById("settingBankAccountNumber");
const settingPageUrl = document.getElementById("settingPageUrl");
const settingGpsUrl = document.getElementById("settingGpsUrl");
const settingSiteName = document.getElementById("settingSiteName");
const settingLogoFileInput = document.getElementById("settingLogoFileInput");
const settingLogoFileName = document.getElementById("settingLogoFileName");
const settingQrCodeUrl = document.getElementById("settingQrCodeUrl");
const settingQrCodeFileInput = document.getElementById("settingQrCodeFileInput");
const settingQrCodeFileName = document.getElementById("settingQrCodeFileName");
const settingPropertyPolicy = document.getElementById("settingPropertyPolicy");
const settingPaymentNote = document.getElementById("settingPaymentNote");

const roomForm = document.getElementById("roomForm");
const roomNameInput = document.getElementById("roomNameInput");
const roomPriceInput = document.getElementById("roomPriceInput");
const roomDetailInput = document.getElementById("roomDetailInput");
const roomImageInput = document.getElementById("roomImageInput");
const roomImageFileInput = document.getElementById("roomImageFileInput");
const roomImageFileName = document.getElementById("roomImageFileName");

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

function renderRoomDetail(detail, roomName = "") {
  let text = String(detail || "ห้องพักของโฮมสเตย์")
    .replace(/\\n/g, "\n")
    .trim();

  if (roomName) {
    const namePattern = new RegExp("^" + escapeRegExp(roomName) + "\\s*", "i");
    text = text.replace(namePattern, "").trim();
  }

  return `<p class="room-detail-text">${escapeHtml(text).replace(/\r?\n/g, "<br>")}</p>`;
}

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

function renderAdminDetailPreview(detail, roomName = "") {
  let text = String(detail || "")
    .replace(/\\n/g, "\n")
    .trim();

  if (roomName) {
    const namePattern = new RegExp("^" + escapeRegExp(roomName) + "\\s*", "i");
    text = text.replace(namePattern, "").trim();
  }

  if (!text) return `<div class="admin-room-detail-preview">ยังไม่มีรายละเอียด</div>`;

  return `<div class="admin-room-detail-preview">${escapeHtml(text).replace(/\r?\n/g, "<br>")}</div>`;
}

function renderAdminImageBlock(imageUrl, altText) {
  const url = String(imageUrl || "").trim();
  if (!url) return `<div class="room-thumb image-missing"><span>ไม่มีรูป</span></div>`;

  return `
    <div class="room-thumb">
      <img src="${escapeHtml(url)}" alt="${escapeHtml(altText || "รูปห้อง")}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('image-missing'); this.remove();" />
      <span>รูปเสีย</span>
    </div>
  `;
}

function statusClass(status) {
  if (status === "ยืนยันแล้ว" || status === "ชำระแล้ว") return "confirmed";
  if (status === "ยกเลิก") return "cancelled";
  return "pending";
}

async function loadDashboard() {
  showLoadingPopup("กำลังโหลดรายการจอง ห้องพัก และการตั้งค่า");
  try {
    const result = await apiRequest({ action: "bootstrap" });
    if (!result.ok) throw new Error(result.message || "โหลดข้อมูลไม่สำเร็จ");

    const payload = result.data || result;
    cachedBookings = Array.isArray(payload.bookings) ? payload.bookings : [];
    rooms = normalizeRooms(payload.rooms || []);
    settings = normalizeSettings(payload.settings || {});
    applyBrandAssets(settings);

    renderSettingsForm();
    renderRoomTable();
    renderAdminCalendar();
    renderDateDetails(adminSelectedDateKey);
    renderBookingTable();
    renderPrepSections();
  } catch (error) {
    console.error(error);
    showToast("โหลดข้อมูลไม่สำเร็จ ตรวจ URL / สิทธิ์ Web App");
  } finally {
    setTimeout(hideLoadingPopup, 350);
  }
}

function renderSettingsForm() {
  settingSiteName.value = settings.siteName?.value || DEFAULT_SETTINGS.siteName.value;
  settingMookataPrice.value = settings.mookata.price || 0;
  settingExtraBedPrice.value = settings.extraBed.price || 0;
  settingBankName.value = settings.bankName.value || "";
  settingBankAccountName.value = settings.bankAccountName.value || "";
  settingBankAccountNumber.value = settings.bankAccountNumber.value || "";
  settingPageUrl.value = settings.pageUrl?.value || "";
  settingGpsUrl.value = settings.gpsUrl?.value || "";
  const currentLogoValue = settings.logoUrl?.value || "";
  settingLogoFileInput.value = "";
  settingLogoFileName.textContent = currentLogoValue
    ? (settings.logoUrl?.fileName || (currentLogoValue.startsWith("data:")
      ? "กำลังใช้โลโก้ที่อัปโหลดไว้"
      : "กำลังใช้โลโก้ที่บันทึกไว้"))
    : "ยังไม่ได้เลือกไฟล์";
  settingQrCodeUrl.value = settings.qrCodeUrl?.value || "";
  settingQrCodeFileInput.value = "";
  updateQrCodeChoiceState();
  settingPropertyPolicy.value = settings.propertyPolicy?.value || "";
  if (settingPaymentNote) settingPaymentNote.value = settings.paymentNote.value || "";
}

async function saveSettings(event) {
  event.preventDefault();

  const logoFile = settingLogoFileInput.files && settingLogoFileInput.files[0];
  const qrUrl = settingQrCodeUrl.value.trim();
  const qrFile = settingQrCodeFileInput.files && settingQrCodeFileInput.files[0];

  if (qrUrl && qrFile) {
    showToast("QR-code เลือกได้อย่างใดอย่างหนึ่งเท่านั้น: ใส่ลิงก์ หรืออัปโหลดรูป");
    return;
  }

  let logoSetting = {
    label: "โลโก้",
    value: settings.logoUrl?.value || DEFAULT_SETTINGS.logoUrl.value
  };

  if (logoFile) {
    const maxLogoSize = 2 * 1024 * 1024;

    if (logoFile.size > maxLogoSize) {
      showToast("ไฟล์โลโก้ต้องมีขนาดไม่เกิน 2MB");
      return;
    }

    if (!logoFile.type.startsWith("image/")) {
      showToast("กรุณาอัปโหลดไฟล์รูปภาพโลโก้เท่านั้น");
      return;
    }

    const logoBase64 = await fileToBase64(logoFile);

    logoSetting = {
      label: "โลโก้",
      value: `data:${logoFile.type};base64,${logoBase64}`,
      fileName: logoFile.name,
      mimeType: logoFile.type,
      base64: logoBase64
    };
  }

  let qrCodeSetting = {
    label: "QR-code ชำระเงิน",
    value: qrUrl
  };

  if (qrFile) {
    const maxSize = 5 * 1024 * 1024;

    if (qrFile.size > maxSize) {
      showToast("รูป QR-code ต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    if (!qrFile.type.startsWith("image/")) {
      showToast("กรุณาอัปโหลดไฟล์รูปภาพ QR-code เท่านั้น");
      return;
    }

    qrCodeSetting = {
      label: "QR-code ชำระเงิน",
      value: "",
      fileName: qrFile.name,
      mimeType: qrFile.type,
      base64: await fileToBase64(qrFile)
    };
  }

  const newSettings = {
    siteName: { label: "ชื่อเว็บไซต์", value: settingSiteName.value.trim() || DEFAULT_SETTINGS.siteName.value },
    logoUrl: logoSetting,
    mookata: { label: "หมูกระทะ", price: Number(settingMookataPrice.value || 0) },
    extraBed: { label: "เตียงเสริม", price: Number(settingExtraBedPrice.value || 0) },
    bankName: { label: "ธนาคาร", value: settingBankName.value.trim() },
    bankAccountName: { label: "ชื่อบัญชี", value: settingBankAccountName.value.trim() },
    bankAccountNumber: { label: "เลขบัญชี", value: settingBankAccountNumber.value.trim() },
    pageUrl: { label: "ลิงก์เพจ", value: settingPageUrl.value.trim() },
    gpsUrl: { label: "ลิงก์ GPS", value: settingGpsUrl.value.trim() },
    qrCodeUrl: qrCodeSetting,
    propertyPolicy: { label: "นโยบายที่พัก", value: settingPropertyPolicy.value.trim() }
  };

  try {
    const result = await apiRequest({ action: "updateSettings", settings: newSettings });
    if (!result.ok) throw new Error(result.message || "บันทึกไม่สำเร็จ");
    settings = normalizeSettings(result.data || newSettings);
    applyBrandAssets(settings);
    renderSettingsForm();
    showToast("บันทึกชื่อเว็บ โลโก้ ราคา บัญชีโอน และ QR-code แล้ว");
  } catch (error) {
    console.error(error);
    showToast("บันทึกการตั้งค่าไม่สำเร็จ");
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("อ่านไฟล์รูปภาพไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

function updateRoomImageChoiceState() {
  const hasUrl = Boolean(roomImageInput.value.trim());
  const file = roomImageFileInput.files && roomImageFileInput.files[0];

  roomImageFileName.textContent = file ? file.name : "ยังไม่ได้เลือกไฟล์";

  if (hasUrl) {
    roomImageFileInput.disabled = true;
    roomImageFileName.textContent = "ปิดอัปโหลด เพราะเลือกใช้ลิงก์แล้ว";
  } else {
    roomImageFileInput.disabled = false;
  }

  if (file) {
    roomImageInput.disabled = true;
    roomImageInput.placeholder = "ปิดช่องลิงก์ เพราะเลือกอัปโหลดรูปแล้ว";
  } else {
    roomImageInput.disabled = false;
    roomImageInput.placeholder = "https://...";
  }
}

function updateLogoChoiceState() {
  const file = settingLogoFileInput.files && settingLogoFileInput.files[0];
  settingLogoFileName.textContent = file ? file.name : (settings.logoUrl?.value ? "กำลังใช้โลโก้ที่บันทึกไว้" : "ยังไม่ได้เลือกไฟล์");
}

function updateQrCodeChoiceState() {
  const hasUrl = Boolean(settingQrCodeUrl.value.trim());
  const file = settingQrCodeFileInput.files && settingQrCodeFileInput.files[0];

  settingQrCodeFileName.textContent = file ? file.name : "ยังไม่ได้เลือกไฟล์";

  if (hasUrl) {
    settingQrCodeFileInput.disabled = true;
    settingQrCodeFileName.textContent = "ปิดอัปโหลด เพราะเลือกใช้ลิงก์แล้ว";
  } else {
    settingQrCodeFileInput.disabled = false;
  }

  if (file) {
    settingQrCodeUrl.disabled = true;
    settingQrCodeUrl.placeholder = "ปิดช่องลิงก์ เพราะเลือกอัปโหลด QR-code แล้ว";
  } else {
    settingQrCodeUrl.disabled = false;
    settingQrCodeUrl.placeholder = "https://...";
  }
}


async function createRoom(event) {
  event.preventDefault();

  const imageUrl = roomImageInput.value.trim();
  const imageFile = roomImageFileInput.files && roomImageFileInput.files[0];

  if (imageUrl && imageFile) {
    showToast("กรุณาเลือกอย่างใดอย่างหนึ่งเท่านั้น: ใส่ลิงก์ หรืออัปโหลดรูป");
    return;
  }

  if (!imageUrl && !imageFile) {
    showToast("กรุณาใส่ลิงก์รูป หรืออัปโหลดรูปอย่างใดอย่างหนึ่ง");
    return;
  }

  let uploadedImage = null;

  if (imageFile) {
    const maxSize = 5 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      showToast("รูปภาพต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(imageFile.type)) {
      showToast("กรุณาใช้รูป JPG, PNG หรือ WEBP เท่านั้น ไม่แนะนำ HEIC จากมือถือ");
      return;
    }

    uploadedImage = {
      fileName: imageFile.name,
      mimeType: imageFile.type,
      base64: await fileToBase64(imageFile)
    };
  }

  const room = {
    name: roomNameInput.value.trim(),
    price: Number(roomPriceInput.value || 0),
    detail: roomDetailInput.value.trim(),
    image: imageUrl,
    imageUpload: uploadedImage,
    active: true
  };

  if (!room.name) {
    showToast("กรุณากรอกชื่อห้อง");
    return;
  }

  try {
    const result = await apiRequest({ action: "createRoom", room });
    if (!result.ok) throw new Error(result.message || "เพิ่มห้องไม่สำเร็จ");
    roomForm.reset();
    updateRoomImageChoiceState();
    await loadDashboard();
    showToast("เพิ่มห้องพักแล้ว");
  } catch (error) {
    console.error(error);
    showToast("เพิ่มห้องพักไม่สำเร็จ");
  }
}

function renderRoomTable() {
  if (!rooms.length) {
    roomTable.innerHTML = `<tr><td colspan="6" class="empty">ยังไม่มีห้องพัก</td></tr>`;
    return;
  }

  roomTable.innerHTML = rooms.map(room => `
    <tr>
      <td>
        <input class="inline-input" id="room-name-${room.id}" value="${escapeHtml(room.name)}" />
      </td>
      <td>
        <input class="inline-input" type="number" id="room-price-${room.id}" value="${Number(room.price || 0)}" />
      </td>
      <td class="room-detail-admin-cell">
        <textarea class="inline-input inline-textarea" id="room-detail-${room.id}" rows="6">${escapeHtml(room.detail || "")}</textarea>
      </td>
      <td class="room-image-admin-cell">
        ${renderAdminImageBlock(room.image || "", room.name)}
        <input class="inline-input image-url-input" id="room-image-${room.id}" value="${escapeHtml(room.image || "")}" placeholder="ลิงก์รูป" />
        <small>ถ้ารูปไม่ขึ้น ให้ใช้อัปโหลดไฟล์แทนลิงก์ Facebook/Line</small>
      </td>
      <td>
        <span class="status ${room.active ? "confirmed" : "cancelled"}">${room.active ? "เปิดจอง" : "ปิดไว้"}</span>
      </td>
      <td>
        <div class="action-row">
          <button onclick="saveRoom('${room.id}')">บันทึก</button>
          <button onclick="toggleRoom('${room.id}', ${room.active ? "false" : "true"})">${room.active ? "ปิด" : "เปิด"}</button>
          <button class="danger-btn" onclick="deleteRoom('${room.id}')">ลบ</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function saveRoom(id) {
  const room = {
    name: document.getElementById(`room-name-${id}`).value.trim(),
    price: Number(document.getElementById(`room-price-${id}`).value || 0),
    detail: document.getElementById(`room-detail-${id}`).value.trim(),
    image: document.getElementById(`room-image-${id}`).value.trim()
  };

  try {
    const result = await apiRequest({ action: "updateRoom", id, room });
    if (!result.ok) throw new Error(result.message || "บันทึกห้องไม่สำเร็จ");
    await loadDashboard();
    showToast("บันทึกข้อมูลห้องแล้ว");
  } catch (error) {
    console.error(error);
    showToast("บันทึกข้อมูลห้องไม่สำเร็จ");
  }
}

async function toggleRoom(id, active) {
  try {
    const result = await apiRequest({ action: "updateRoom", id, room: { active } });
    if (!result.ok) throw new Error(result.message || "เปลี่ยนสถานะไม่สำเร็จ");
    await loadDashboard();
    showToast(active ? "เปิดห้องให้จองแล้ว" : "ปิดห้องพักแล้ว");
  } catch (error) {
    console.error(error);
    showToast("เปลี่ยนสถานะห้องไม่สำเร็จ");
  }
}

async function deleteRoom(id) {
  if (!confirm("ต้องการลบห้องพักนี้ใช่ไหม?")) return;

  try {
    const result = await apiRequest({ action: "deleteRoom", id });
    if (!result.ok) throw new Error(result.message || "ลบห้องไม่สำเร็จ");
    await loadDashboard();
    showToast("ลบห้องพักแล้ว");
  } catch (error) {
    console.error(error);
    showToast("ลบห้องพักไม่สำเร็จ");
  }
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

function formatThaiDate(value) {
  if (!value) return "ยังไม่เลือกวันที่";
  const date = fromDateKey(value);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function isCancelledBooking(booking) {
  const status = String(booking.status || "").trim().toLowerCase();
  const paymentStatus = String(booking.paymentStatus || "").trim().toLowerCase();
  return status.includes("ยกเลิก") || paymentStatus.includes("ยกเลิก") || status.includes("cancel") || paymentStatus.includes("cancel");
}

function bookingCoversDate(booking, dateKey) {
  if (!booking.checkIn || !booking.checkOut) return false;

  if (isCancelledBooking(booking)) return false;

  return dateKey >= booking.checkIn && dateKey < booking.checkOut;
}

function getBookingsForDate(dateKey) {
  return cachedBookings.filter(booking => bookingCoversDate(booking, dateKey));
}

function getAvailableRoomsForDate(dateKey) {
  const bookedRoomIds = new Set(getBookingsForDate(dateKey).map(booking => String(booking.roomId)));
  return rooms.filter(room => room.active && !bookedRoomIds.has(String(room.id)));
}

function renderAdminCalendar() {
  if (!adminCalendarGrid) return;

  const year = adminCalendarDate.getFullYear();
  const month = adminCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  adminCalendarMonthText.textContent = firstDay.toLocaleDateString("th-TH", {
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
    const dayBookings = getBookingsForDate(key);
    const hasBooking = dayBookings.length > 0;
    const availableRoomCount = getAvailableRoomsForDate(key).length;

    const classes = ["calendar-day", hasBooking ? "booked" : "available"];
    if (key === adminSelectedDateKey) classes.push("selected-start");

    const badge = hasBooking ? `${dayBookings.length} จอง` : "ว่าง";
    const roomText = `${availableRoomCount} ห้องว่าง`;

    cells.push(`
      <button type="button" class="${classes.join(" ")}" onclick="selectAdminCalendarDate('${key}')">
        <strong class="admin-day-number">${day}</strong>
        <span class="admin-day-status">${badge}</span>
        <small class="admin-day-room">${roomText}</small>
      </button>
    `);
  }

  adminCalendarGrid.innerHTML = cells.join("");
}

function selectAdminCalendarDate(dateKey) {
  adminSelectedDateKey = dateKey;
  renderAdminCalendar();
  renderDateDetails(dateKey);
}

function renderDateDetails(dateKey) {
  if (!adminDateDetailList) return;

  if (!dateKey) {
    adminSelectedDateText.textContent = "ยังไม่เลือกวันที่";
    adminDateDetailList.innerHTML = `<div class="empty">กดวันที่ในปฏิทินเพื่อดูรายละเอียดลูกค้าที่จอง</div>`;
    return;
  }

  const dayBookings = getBookingsForDate(dateKey);
  const availableRooms = getAvailableRoomsForDate(dateKey);

  adminSelectedDateText.textContent = formatThaiDate(dateKey);

  const availableHtml = `
    <div class="date-available-box">
      <b>ห้องว่างวันนี้: ${availableRooms.length} ห้อง</b>
      <span>${availableRooms.length ? availableRooms.map(room => escapeHtml(room.name)).join(", ") : "ไม่มีห้องว่าง"}</span>
    </div>
  `;

  if (!dayBookings.length) {
    adminDateDetailList.innerHTML = `
      ${availableHtml}
      <div class="empty">วันนี้ยังไม่มีลูกค้าจอง</div>
    `;
    return;
  }

  const bookingHtml = dayBookings.map(booking => {
    const addons = [];
    if (Number(booking.mookataQty || 0) > 0) addons.push(`หมูกระทะ ${booking.mookataQty} ชุด`);
    if (Number(booking.extraBedQty || 0) > 0) addons.push(`เตียงเสริม ${booking.extraBedQty} เตียง`);

    return `
      <article class="date-booking-card">
        <div class="date-booking-top">
          <div>
            <span>เลขรายการจอง</span>
            <strong>${escapeHtml(booking.bookingCode || booking.id || "-")}</strong>
          </div>
          <span class="status ${statusClass(booking.status)}">${escapeHtml(booking.status || "-")}</span>
        </div>

        <div class="date-booking-grid">
          <div>
            <span>ลูกค้า</span>
            <b>${escapeHtml(booking.name || "-")}</b>
            <small>${escapeHtml(booking.phone || "-")}</small>
            ${booking.email ? `<small>${escapeHtml(booking.email)}</small>` : ""}
          </div>
          <div>
            <span>ห้องพัก</span>
            <b>${escapeHtml(booking.roomName || "-")}</b>
            <small>${escapeHtml(booking.checkIn)} → ${escapeHtml(booking.checkOut)}</small>
          </div>
          <div>
            <span>บริการเสริม</span>
            <b>${escapeHtml(addons.length ? addons.join(", ") : "ไม่มี")}</b>
            <small>รวมเสริม ${formatMoney(booking.addonTotal || 0)}</small>
          </div>
          <div>
            <span>ยอดรวม</span>
            <b>${formatMoney(booking.grandTotal || 0)}</b>
            <small>${escapeHtml(booking.paymentStatus || "รอชำระเงิน")}</small>
          </div>
        </div>

        ${booking.note ? `<p class="date-note">หมายเหตุ: ${escapeHtml(booking.note)}</p>` : ""}
        ${booking.slipUrl ? `<a class="slip-link" href="${escapeHtml(booking.slipUrl)}" target="_blank" rel="noopener">ดูสลิปการโอน</a>` : ""}
      </article>
    `;
  }).join("");

  adminDateDetailList.innerHTML = availableHtml + bookingHtml;
}

function renderBookingTable() {
  const keyword = (searchBooking?.value || "").toLowerCase();
  const filter = statusFilter?.value || "all";

  const filtered = cachedBookings.filter(booking => {
    const matchKeyword = [
      booking.bookingCode,
      booking.name,
      booking.phone,
      booking.email,
      booking.roomName
    ].join(" ").toLowerCase().includes(keyword);

    const matchStatus = filter === "all" || booking.status === filter || booking.paymentStatus === filter;
    return matchKeyword && matchStatus;
  });

  document.getElementById("totalBookings").textContent = cachedBookings.length;
  document.getElementById("pendingBookings").textContent = cachedBookings.filter(b => b.status === "รอยืนยัน" || b.status === "รอชำระเงิน").length;
  document.getElementById("confirmedBookings").textContent = cachedBookings.filter(b => b.status === "ยืนยันแล้ว" || b.status === "ชำระแล้ว").length;
  document.getElementById("cancelledBookings").textContent = cachedBookings.filter(isCancelledBooking).length;
  document.getElementById("totalRevenue").textContent = formatMoney(
    cachedBookings
      .filter(b => !isCancelledBooking(b) && (b.status === "ยืนยันแล้ว" || b.status === "ชำระแล้ว"))
      .reduce((sum, b) => sum + Number(b.grandTotal || b.total || 0), 0)
  );

  if (!filtered.length) {
    bookingTable.innerHTML = `<tr><td colspan="7" class="empty">ยังไม่มีรายการจอง</td></tr>`;
    return;
  }

  bookingTable.innerHTML = filtered.map(booking => {
    const mookataQty = Number(booking.mookataQty || 0);
    const extraBedQty = Number(booking.extraBedQty || 0);
    const addonLines = [];

    if (mookataQty > 0) {
      addonLines.push(`หมูกระทะ ${mookataQty} ชุด × ${formatMoney(booking.mookataPrice)}`);
    }

    if (extraBedQty > 0) {
      addonLines.push(`เตียงเสริม ${extraBedQty} เตียง × ${formatMoney(booking.extraBedPrice)}`);
    }

    return `
      <tr>
        <td>
          <b>${escapeHtml(booking.name)}</b>
          <small>เลขรายการจอง: ${escapeHtml(booking.bookingCode || booking.id || "-")}</small>
          <small>${escapeHtml(booking.phone)}</small>
          ${booking.email ? `<small>${escapeHtml(booking.email)}</small>` : ""}
          ${booking.note ? `<small>หมายเหตุ: ${escapeHtml(booking.note)}</small>` : ""}
        </td>
        <td>
          <b>${escapeHtml(booking.roomName)}</b>
          <small>${escapeHtml(booking.checkIn)} → ${escapeHtml(booking.checkOut)}</small>
          <small>${booking.nights} คืน • ค่าห้อง ${formatMoney(booking.roomTotal || 0)}</small>
          <small>ค่าจอง ${formatMoney(booking.bookingFee || 0)}</small>
        </td>
        <td>
          ${addonLines.length ? addonLines.map(line => `<small>${escapeHtml(line)}</small>`).join("") : `<small>ไม่มีบริการเสริม</small>`}
          <small>รวมบริการเสริม ${formatMoney(booking.addonTotal || 0)}</small>
        </td>
        <td>
          <b>${escapeHtml(booking.paymentStatus || "รอชำระเงิน")}</b>
          <small>${escapeHtml(booking.paymentMethod || "โอนผ่านบัญชีธนาคาร")}</small>
          ${booking.slipUrl ? `<small><a href="${escapeHtml(booking.slipUrl)}" target="_blank" rel="noopener">ดูสลิปการโอน</a></small>` : `<small>ยังไม่มีสลิป</small>`}
        </td>
        <td><b>${formatMoney(booking.grandTotal || booking.total || 0)}</b></td>
        <td><span class="status ${statusClass(booking.status)}">${escapeHtml(booking.status)}</span></td>
        <td>
          <div class="action-row">
            <button onclick="updateStatus('${booking.id}', 'ชำระแล้ว')">ชำระแล้ว</button>
            <button onclick="updateStatus('${booking.id}', 'ยืนยันแล้ว')">ยืนยัน</button>
            <button onclick="updateStatus('${booking.id}', 'ยกเลิก')">ยกเลิก</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function updateStatus(id, status) {
  try {
    await apiRequest({ action: "updateStatus", id, status });
    await loadDashboard();
    showToast(`เปลี่ยนสถานะเป็น ${status}`);
  } catch (error) {
    console.error(error);
    showToast("เปลี่ยนสถานะไม่สำเร็จ");
  }
}

async function deleteBooking(id) {
  if (!confirm("ต้องการลบรายการจองนี้ใช่ไหม?")) return;

  try {
    await apiRequest({ action: "delete", id });
    await loadDashboard();
    showToast("ลบรายการแล้ว");
  } catch (error) {
    console.error(error);
    showToast("ลบรายการไม่สำเร็จ");
  }
}

function exportCsv() {
  if (!cachedBookings.length) {
    showToast("ยังไม่มีข้อมูลสำหรับ Export");
    return;
  }

  const header = [
    "เลขรายการจอง", "ชื่อ", "เบอร์โทร", "อีเมล", "ห้อง", "เช็กอิน", "เช็กเอาต์", "จำนวนคืน", "ผู้เข้าพัก",
    "หมูกระทะจำนวน", "ราคาหมูกระทะ", "เตียงเสริมจำนวน", "ราคาเตียงเสริม",
    "ค่าห้อง", "ค่าบริการเสริม", "ค่าจอง", "ยอดรวม", "วิธีชำระ", "สถานะชำระ", "ไฟล์สลิป",
    "ลิงก์สลิป", "สถานะจอง", "หมายเหตุ"
  ];

  const rows = cachedBookings.map(b => [
    b.bookingCode, b.name, b.phone, b.email, b.roomName, b.checkIn, b.checkOut, b.nights, b.guestCount,
    b.mookataQty, b.mookataPrice, b.extraBedQty, b.extraBedPrice,
    b.roomTotal, b.addonTotal, b.bookingFee, b.grandTotal, b.paymentMethod, b.paymentStatus,
    b.slipFileName, b.slipUrl, b.status, b.note
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "greenstay-bookings.csv";
  link.click();
  URL.revokeObjectURL(url);
}

roomImageInput.addEventListener("input", updateRoomImageChoiceState);
roomImageFileInput.addEventListener("change", updateRoomImageChoiceState);
settingSiteName.addEventListener("input", () => {
  const previewName = settingSiteName.value.trim() || DEFAULT_SETTINGS.siteName.value;
  document.querySelectorAll("header.topbar .brand h1").forEach(el => {
    el.textContent = previewName;
  });
  const suffix = document.body?.dataset?.pageTitleSuffix || "";
  document.title = suffix ? `${previewName} - ${suffix}` : previewName;
});
settingLogoFileInput.addEventListener("change", updateLogoChoiceState);
settingQrCodeUrl.addEventListener("input", updateQrCodeChoiceState);
settingQrCodeFileInput.addEventListener("change", updateQrCodeChoiceState);

if (adminPrevMonthBtn && adminNextMonthBtn) {
  adminPrevMonthBtn.addEventListener("click", () => {
    adminCalendarDate = new Date(adminCalendarDate.getFullYear(), adminCalendarDate.getMonth() - 1, 1);
    renderAdminCalendar();
  });

  adminNextMonthBtn.addEventListener("click", () => {
    adminCalendarDate = new Date(adminCalendarDate.getFullYear(), adminCalendarDate.getMonth() + 1, 1);
    renderAdminCalendar();
  });
}



// ======= CREDIT SYSTEM (Admin) - v2 =======

// --- localStorage keys ---
// hs_credits, hs_plan_type, hs_plan_start  (จาก app-config.js)
// hs_topup_requests  = JSON array ของคำขอเติมเครดิต

function getTopupRequests() {
  try { return JSON.parse(localStorage.getItem("hs_topup_requests") || "[]"); } catch { return []; }
}
function saveTopupRequests(arr) {
  localStorage.setItem("hs_topup_requests", JSON.stringify(arr));
}

// --- Render credit bar ---
function renderCreditCard() {
  const type = getPlanType();
  const credits = getCredits();
  const display = document.getElementById("creditDisplay");
  const badge  = document.getElementById("creditPlanBadge");
  const expiry = document.getElementById("creditExpiry");
  const card   = document.getElementById("creditStatusCard");
  if (!display) return;

  const active = isSystemActive();
  card.className = "credit-bar hidden" + (active ? "" : " credit-bar-inactive");

  if (type === "infinity") {
    display.textContent = "∞";
    badge.textContent = "♾️ อินฟินิตี้";
    badge.className = "credit-plan-badge badge-infinity";
    if (expiry) expiry.textContent = "";
  } else if (type === "yearly") {
    const exp = getExpiryDate();
    const expStr = exp ? exp.toLocaleDateString("th-TH", { year:"numeric", month:"long", day:"numeric" }) : "-";
    const daysLeft = exp ? Math.ceil((exp - new Date()) / 86400000) : 0;
    display.textContent = `${daysLeft > 0 ? daysLeft : 0} วัน`;
    badge.textContent = "📅 รายปี";
    badge.className = "credit-plan-badge badge-yearly";
    if (expiry) {
      expiry.textContent = `หมดอายุ ${expStr}`;
      expiry.className = "credit-expiry-inline" + (daysLeft <= 30 ? " expiry-warn" : "");
    }
  } else {
    display.textContent = credits;
    badge.textContent = credits > 0 ? "✅ ใช้งานได้" : "❌ เครดิตหมด";
    badge.className = "credit-plan-badge " + (credits > 0 ? "badge-ok" : "badge-empty");
    if (expiry) {
      expiry.textContent = !active ? "⚠️ เครดิตหมด" : "";
      expiry.className = "credit-expiry-inline" + (!active ? " expiry-warn" : "");
    }
  }

  // ตรวจ pending request ของตัวเอง
  checkPendingRequest();
}

function checkPendingRequest() {
  const reqs = getTopupRequests();
  const pending = reqs.find(r => r.status === "pending");
  const btn = document.getElementById("openTopupBtn");
  if (!btn) return;
  if (pending) {
    btn.textContent = "⏳ รอการอนุมัติ";
    btn.style.background = "#f59e0b";
  } else {
    btn.textContent = "➕ เติมเครดิต";
    btn.style.background = "";
  }
}

// --- Topup Modal ---
let selectedTopupPkg = null;
let topupSlipBase64 = "";
let topupSlipMime = "";
let topupSlipFilename = "";

function openTopupModal() {
  const reqs = getTopupRequests();
  const pending = reqs.find(r => r.status === "pending");
  document.getElementById("topupModal").classList.remove("hidden");

  if (pending) {
    document.getElementById("topupStep1").classList.add("hidden");
    document.getElementById("topupStep2").classList.remove("hidden");
    return;
  }
  document.getElementById("topupStep1").classList.remove("hidden");
  document.getElementById("topupStep2").classList.add("hidden");

  // render packages
  const grid = document.getElementById("topupPkgGrid");
  grid.innerHTML = CREDIT_PACKAGES.map(pkg => {
    const idKey = pkg.type === "yearly" ? "YEAR" : pkg.credits;
    const creditsDesc = pkg.type === "yearly" ? "รายปี 1 ปี" : `${pkg.credits} เครดิต`;
    return `
    <div class="topup-pkg-card" id="tpkg_${idKey}" onclick="selectTopupPkg('${idKey}',${pkg.price},'${pkg.label}')">
      <div class="tpkg-label">${pkg.label}</div>
      <div class="tpkg-credits">${creditsDesc}</div>
      <div class="tpkg-price">฿${pkg.price.toLocaleString()}</div>
    </div>`;
  }).join("");

  // load bank info from settings
  const s = normalizeSettings ? normalizeSettings(DEFAULT_SETTINGS) : DEFAULT_SETTINGS;
  const bankData = JSON.parse(localStorage.getItem("hs_settings") || "null");
  const bankName   = bankData?.bankName?.value   || DEFAULT_SETTINGS.bankName.value;
  const bankAccName = bankData?.bankAccountName?.value || DEFAULT_SETTINGS.bankAccountName.value;
  const bankAccNo  = bankData?.bankAccountNumber?.value || DEFAULT_SETTINGS.bankAccountNumber.value;
  document.getElementById("topupBankName").textContent   = bankName;
  document.getElementById("topupBankAccName").textContent = bankAccName;
  document.getElementById("topupBankAccNo").textContent   = bankAccNo;
  document.getElementById("topupAmountText").textContent  = "กรุณาเลือกแพ็กเกจ";

  selectedTopupPkg = null;
  topupSlipBase64 = "";
  topupSlipFilename = "";
  document.getElementById("topupSendBtn").disabled = true;
  document.getElementById("topupSlipPreview").classList.add("hidden");
  document.getElementById("topupSlipDropzone").classList.remove("hidden");

  // slip input handler
  const slipInput = document.getElementById("topupSlipInput");
  slipInput.value = "";
  slipInput.onchange = handleTopupSlip;
}

function closeTopupModal() {
  document.getElementById("topupModal").classList.add("hidden");
}

function selectTopupPkg(credits, price, label) {
  selectedTopupPkg = { credits, price, label };
  document.querySelectorAll(".topup-pkg-card").forEach(c => c.classList.remove("selected"));
  const el = document.getElementById("tpkg_" + credits);
  if (el) el.classList.add("selected");
  const desc = credits === "YEAR" ? "รายปี 1 ปี" : `${credits} เครดิต`;
  document.getElementById("topupAmountText").textContent = `฿${price.toLocaleString()} (${desc})`;
  updateTopupSendBtn();
}

function handleTopupSlip(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const result = ev.target.result;
    topupSlipBase64 = result.split(",")[1];
    topupSlipMime = file.type;
    topupSlipFilename = file.name;
    document.getElementById("topupSlipDropzone").classList.add("hidden");
    const preview = document.getElementById("topupSlipPreview");
    preview.classList.remove("hidden");
    if (file.type.startsWith("image/")) {
      document.getElementById("topupSlipImg").src = result;
      document.getElementById("topupSlipImg").style.display = "block";
    } else {
      document.getElementById("topupSlipImg").style.display = "none";
    }
    document.getElementById("topupSlipName").textContent = file.name;
    updateTopupSendBtn();
  };
  reader.readAsDataURL(file);
}

function clearTopupSlip() {
  topupSlipBase64 = "";
  topupSlipFilename = "";
  document.getElementById("topupSlipInput").value = "";
  document.getElementById("topupSlipPreview").classList.add("hidden");
  document.getElementById("topupSlipDropzone").classList.remove("hidden");
  updateTopupSendBtn();
}

function updateTopupSendBtn() {
  const btn = document.getElementById("topupSendBtn");
  if (btn) btn.disabled = !(selectedTopupPkg && topupSlipBase64);
}

function copyTopupAccNo() {
  const no = document.getElementById("topupBankAccNo").textContent;
  navigator.clipboard.writeText(no).then(() => showToast("คัดลอกเลขบัญชีแล้ว")).catch(() => showToast("คัดลอกไม่ได้"));
}

function sendTopupRequest() {
  if (!selectedTopupPkg || !topupSlipBase64) return;
  const reqs = getTopupRequests();
  const isYearly = selectedTopupPkg.credits === "YEAR";
  const newReq = {
    id: "TR" + Date.now(),
    credits: selectedTopupPkg.credits,
    price: selectedTopupPkg.price,
    label: selectedTopupPkg.label,
    type: isYearly ? "yearly" : "credit",
    slipBase64: topupSlipBase64,
    slipMime: topupSlipMime,
    slipFilename: topupSlipFilename,
    status: "pending",
    requestedAt: new Date().toISOString()
  };
  reqs.push(newReq);
  saveTopupRequests(reqs);

  document.getElementById("topupStep1").classList.add("hidden");
  document.getElementById("topupStep2").classList.remove("hidden");
  showToast("ส่งคำขอเรียบร้อย รอ Company อนุมัติ");
  checkPendingRequest();
}

// Auto-check ถ้า Company อนุมัติแล้ว (poll ทุก 5 วินาที)
setInterval(() => {
  const reqs = getTopupRequests();
  const approved = reqs.filter(r => r.status === "approved");
  if (approved.length) {
    approved.forEach(r => {
      if (r.type === "yearly") {
        const start = new Date().toISOString().split("T")[0];
        setPlan("yearly", start);
        showToast(`✅ Company อนุมัติแล้ว! เปิดใช้งานแพ็กเกจรายปีสำเร็จ`);
      } else {
        setCredits(getCredits() + r.credits);
        showToast(`✅ Company อนุมัติแล้ว! ได้รับ ${r.credits} เครดิต`);
      }
      r.status = "done";
    });
    saveTopupRequests(reqs);
    renderCreditCard(); renderHeaderCredit();
  }
}, 5000);

loginBtn.addEventListener("click", async () => {
  if (adminPassword.value === ADMIN_PASSWORD) {
    adminLoginBox.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    await loadDashboard();
    renderCreditCard(); renderHeaderCredit();
    showToast("เข้าสู่ระบบสำเร็จ");
  } else {
    showToast("รหัสผ่านไม่ถูกต้อง");
  }
});

logoutBtn.addEventListener("click", () => {
  adminPassword.value = "";
  adminDashboard.classList.add("hidden");
  adminLoginBox.classList.remove("hidden");
});

refreshBtn.addEventListener("click", loadDashboard);
settingsForm.addEventListener("submit", saveSettings);
roomForm.addEventListener("submit", createRoom);
searchBooking.addEventListener("input", renderBookingTable);
statusFilter.addEventListener("change", renderBookingTable);
exportCsvBtn.addEventListener("click", exportCsv);

document.addEventListener("DOMContentLoaded", function(){
  applyBrandAssets(normalizeSettings(typeof localGetSettings === "function" ? localGetSettings() : DEFAULT_SETTINGS));
  renderCreditCard();
  renderHeaderCredit();
});

// ===== HEADER CREDIT DISPLAY =====
function renderHeaderCredit() {
  const type = getPlanType();
  const credits = getCredits();
  const valEl = document.getElementById('headerCreditVal');
  const labelEl = document.querySelector('.header-credit-label');
  const topupBtn = document.getElementById('headerTopupBtn');
  const creditWrap = document.getElementById('headerCreditWrap');
  if (!valEl) return;

  const active = isSystemActive();
  if (creditWrap) {
    creditWrap.classList.toggle('is-inactive', !active);
  }
  if (type === 'infinity') {
    valEl.textContent = '∞';
    if (labelEl) labelEl.textContent = 'อินฟินิตี้';
  } else if (type === 'yearly') {
    const exp = getExpiryDate();
    const daysLeft = exp ? Math.max(0, Math.ceil((exp - new Date()) / 86400000)) : 0;
    valEl.textContent = daysLeft + ' วัน';
    if (labelEl) labelEl.textContent = 'รายปี';
  } else {
    valEl.textContent = credits;
    if (labelEl) labelEl.textContent = active ? 'เครดิต' : '⚠️ หมด';
  }

  const reqs = getTopupRequests();
  const pending = reqs.find(r => r.status === 'pending');
  if (topupBtn) {
    topupBtn.classList.toggle('is-pending', Boolean(pending));
    if (pending) {
      topupBtn.textContent = '⏳ รอการอนุมัติ';
    } else {
      topupBtn.textContent = '➕ เติมเครดิต';
    }
  }
}

// ===== PREP SECTIONS =====
function renderPrepSections() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  const thaiToday = today.toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const thaiTomorrow = tomorrow.toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const todayDateEl = document.getElementById('prepTodayDate');
  const tomorrowDateEl = document.getElementById('prepTomorrowDate');
  if (todayDateEl) todayDateEl.textContent = thaiToday;
  if (tomorrowDateEl) tomorrowDateEl.textContent = thaiTomorrow;

  renderPrepDay(todayKey, 'prepTodayBody');
  renderPrepDay(tomorrowKey, 'prepTomorrowBody');
}

function renderPrepDay(dateKey, bodyId) {
  const body = document.getElementById(bodyId);
  if (!body) return;

  const bookings = cachedBookings.filter(b => {
    if (isCancelledBooking(b)) return false;
    return b.checkIn === dateKey && (Number(b.mookataQty || 0) > 0 || Number(b.extraBedQty || 0) > 0);
  });

  if (!bookings.length) {
    body.innerHTML = '<div class="prep-empty">✅ ไม่มีรายการที่ต้องเตรียม</div>';
    return;
  }

  body.innerHTML = bookings.map(b => {
    const moo = Number(b.mookataQty || 0);
    const bed = Number(b.extraBedQty || 0);
    const addons = [];
    if (moo > 0) addons.push('<span class="prep-addon-tag">🍖 หมูกระทะ ' + moo + ' ชุด</span>');
    if (bed > 0) addons.push('<span class="prep-addon-tag bed">🛏 เตียงเสริม ' + bed + ' เตียง</span>');
    return '<div class="prep-item">' +
      '<span class="prep-booking-code">' + escapeHtml(b.bookingCode || b.id || '-') + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="prep-name">' + escapeHtml(b.name || '-') + '</div>' +
        '<div class="prep-room">🏠 ' + escapeHtml(b.roomName || '-') + '</div>' +
        '<div class="prep-addons">' + addons.join('') + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}
