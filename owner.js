let cachedBookings = [];
let rooms = [];
let settings = normalizeSettings(DEFAULT_SETTINGS);
let ownerCalendarDate = new Date();
let ownerSelectedDateKey = "";
let roomCloseTargetId = "";
let roomCloseCalendarDate = new Date();
let roomCloseSelectedDate = "";

const ownerLoginBox = document.getElementById("ownerLoginBox");
const ownerDashboard = document.getElementById("ownerDashboard");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const ownerPassword = document.getElementById("ownerPassword");
let ownerLoginHomestay = document.getElementById("ownerLoginHomestay");
const bookingTable = document.getElementById("bookingTable");
const roomTable = document.getElementById("roomTable");
const searchBooking = document.getElementById("searchBooking");
const statusFilter = document.getElementById("statusFilter");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const ownerPrevMonthBtn = document.getElementById("ownerPrevMonthBtn");
const ownerNextMonthBtn = document.getElementById("ownerNextMonthBtn");
const ownerCalendarMonthText = document.getElementById("ownerCalendarMonthText");
const ownerCalendarGrid = document.getElementById("ownerCalendarGrid");
const ownerSelectedDateText = document.getElementById("ownerSelectedDateText");
const ownerDateDetailList = document.getElementById("ownerDateDetailList");
const roomCloseModal = document.getElementById("roomCloseModal");
const roomCloseTitle = document.getElementById("roomCloseTitle");
const roomCloseNote = document.getElementById("roomCloseNote");
const roomClosePrevBtn = document.getElementById("roomClosePrevBtn");
const roomCloseNextBtn = document.getElementById("roomCloseNextBtn");
const roomCloseMonthText = document.getElementById("roomCloseMonthText");
const roomCloseCalendarGrid = document.getElementById("roomCloseCalendarGrid");
const roomCloseSelectedText = document.getElementById("roomCloseSelectedText");
const roomCloseConfirmBtn = document.getElementById("roomCloseConfirmBtn");

const settingsForm = document.getElementById("settingsForm");
const settingMookataPrice = document.getElementById("settingMookataPrice");
const settingExtraBedPrice = document.getElementById("settingExtraBedPrice");
const settingBankName = document.getElementById("settingBankName");
const settingBankAccountName = document.getElementById("settingBankAccountName");
const settingBankAccountNumber = document.getElementById("settingBankAccountNumber");
const settingPromptPayId = document.getElementById("settingPromptPayId");
const settingPageUrl = document.getElementById("settingPageUrl");
const settingGpsUrl = document.getElementById("settingGpsUrl");
const settingSiteName = document.getElementById("settingSiteName");
const settingLogoFileInput = document.getElementById("settingLogoFileInput");
const settingLogoFileName = document.getElementById("settingLogoFileName");
const settingLogoPreview = document.getElementById("settingLogoPreview");
const settingPropertyPolicy = document.getElementById("settingPropertyPolicy");
const settingPaymentNote = document.getElementById("settingPaymentNote");
const settingAddonList = document.getElementById("settingAddonList");
const addSettingAddonBtn = document.getElementById("addSettingAddonBtn");
const settingOwnerPassword = document.getElementById("settingOwnerPassword");
const settingOwnerPasswordConfirm = document.getElementById("settingOwnerPasswordConfirm");
const saveOwnerPasswordBtn = document.getElementById("saveOwnerPasswordBtn");
const settingOwnerLineToId = document.getElementById("settingOwnerLineToId");
const saveOwnerLineToIdBtn = document.getElementById("saveOwnerLineToIdBtn");
const settingHeroTextPill = document.getElementById("settingHeroTextPill");
const settingHeroTextTitle = document.getElementById("settingHeroTextTitle");
const settingHeroTextBody = document.getElementById("settingHeroTextBody");
const settingHeroTextImageFile = document.getElementById("settingHeroTextImageFile");
const settingHeroTextImageName = document.getElementById("settingHeroTextImageName");
const settingHeroCardEyebrow = document.getElementById("settingHeroCardEyebrow");
const settingHeroCardTitle = document.getElementById("settingHeroCardTitle");
const settingHeroCardSubtitle = document.getElementById("settingHeroCardSubtitle");
const settingHeroCardImageFile = document.getElementById("settingHeroCardImageFile");
const settingHeroCardImageName = document.getElementById("settingHeroCardImageName");

const roomForm = document.getElementById("roomForm");
const roomNameInput = document.getElementById("roomNameInput");
const roomPriceInput = document.getElementById("roomPriceInput");
const roomDetailInput = document.getElementById("roomDetailInput");
const roomImageInput = document.getElementById("roomImageInput");
const roomImageFileInput = document.getElementById("roomImageFileInput");
const roomImageFileName = document.getElementById("roomImageFileName");
const roomImagePreview = document.getElementById("roomImagePreview");

function formatMultiline(value) {
  return escapeHtml(value || "").replace(/\r?\n/g, "<br>");
}

function getOwnerLoginHomestayElement() {
  if (ownerLoginHomestay) return ownerLoginHomestay;

  const loginCard = ownerLoginBox?.querySelector(".login-card");
  const passwordInput = document.getElementById("ownerPassword");
  if (!loginCard || !passwordInput) return null;

  ownerLoginHomestay = document.createElement("p");
  ownerLoginHomestay.id = "ownerLoginHomestay";
  ownerLoginHomestay.className = "owner-login-homestay";
  loginCard.insertBefore(ownerLoginHomestay, passwordInput);
  return ownerLoginHomestay;
}

function updateOwnerLoginHomestayLabel(name) {
  const el = getOwnerLoginHomestayElement();
  if (!el) return;

  const slug = typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "";
  const displayName = String(name || settings.siteName?.value || slug || "โฮมสเตย์").trim();
  const slugText = slug && slug !== displayName ? ` (${slug})` : "";
  el.textContent = `กำลังล็อกอินของ: ${displayName}${slugText}`;
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

function renderOwnerDetailPreview(detail, roomName = "") {
  let text = String(detail || "")
    .replace(/\\n/g, "\n")
    .trim();

  if (roomName) {
    const namePattern = new RegExp("^" + escapeRegExp(roomName) + "\\s*", "i");
    text = text.replace(namePattern, "").trim();
  }

  if (!text) return `<div class="owner-room-detail-preview">ยังไม่มีรายละเอียด</div>`;

  return `<div class="owner-room-detail-preview">${escapeHtml(text).replace(/\r?\n/g, "<br>")}</div>`;
}

function renderOwnerImageBlock(imageUrl, altText) {
  const url = String(imageUrl || "").trim();
  if (!url) return `<div class="room-thumb image-missing"><span>ไม่มีรูป</span></div>`;

  return `
    <div class="room-thumb">
      <img src="${escapeHtml(url)}" alt="${escapeHtml(altText || "รูปห้อง")}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('image-missing'); this.remove();" />
      <span>รูปเสีย</span>
    </div>
  `;
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

function statusClass(status) {
  if (status === "ยืนยันแล้ว" || status === "ชำระแล้ว") return "confirmed";
  if (status === "ยกเลิก") return "cancelled";
  return "pending";
}

async function loadDashboard(silent = false) {
  if (!silent) showLoadingPopup("กำลังโหลดรายการจอง ห้องพัก และการตั้งค่า");
  try {
    const result = await apiRequest({ action: "bootstrap" });
    if (!result.ok) throw new Error(result.message || "โหลดข้อมูลไม่สำเร็จ");

    const payload = result.data || result;
    cachedBookings = Array.isArray(payload.bookings) ? payload.bookings : [];
    rooms = normalizeRooms(payload.rooms || []);
    settings = normalizeSettings(payload.settings || {});
    applyBrandAssets(settings);
    updateOwnerLoginHomestayLabel();
    if (!ownerSelectedDateKey) {
      ownerSelectedDateKey = toDateKey(new Date());
      ownerCalendarDate = new Date();
    }

    renderSettingsForm();
    renderRoomTable();
    renderOwnerCalendar();
    renderDateDetails(ownerSelectedDateKey);
    renderBookingTable();
    renderPrepSections();
    autoVerifyPendingSlips();
    renderCreditCard();
    renderHeaderCredit();
  } catch (error) {
    console.error(error);
    if (typeof resetLocalPlanState === "function") {
      resetLocalPlanState();
      renderCreditCard();
      renderHeaderCredit();
    }
    showToast("โหลดข้อมูลไม่สำเร็จ ตรวจ URL / สิทธิ์ Web App");
  } finally {
    if (!silent) setTimeout(hideLoadingPopup, 350);
  }
}

async function syncOwnerPlanOnPageLoad() {
  try {
    const result = await apiRequest({ action: "bootstrap" });
    if (!result.ok) throw new Error(result.message || "โหลดเครดิตไม่สำเร็จ");
    const payload = result.data || result;
    if (payload.settings) {
      settings = normalizeSettings(payload.settings || {});
      applyBrandAssets(settings);
    }
    updateOwnerLoginHomestayLabel();
  } catch (error) {
    console.warn("Plan sync failed; clearing stale local credits:", error?.message);
    if (typeof resetLocalPlanState === "function") resetLocalPlanState();
    updateOwnerLoginHomestayLabel();
  } finally {
    renderCreditCard();
    renderHeaderCredit();
  }
}

function renderSettingsForm() {
  settingSiteName.value = settings.siteName?.value || DEFAULT_SETTINGS.siteName.value;
  settingMookataPrice.value = settings.mookata.price || 0;
  settingExtraBedPrice.value = settings.extraBed.price || 0;
  renderAddonSettingsForm();
  settingBankName.value = settings.bankName.value || "";
  settingBankAccountName.value = settings.bankAccountName.value || "";
  settingBankAccountNumber.value = settings.bankAccountNumber.value || "";
  if (settingPromptPayId) settingPromptPayId.value = settings.promptPayId?.value || "";
  settingPageUrl.value = settings.pageUrl?.value || "";
  settingGpsUrl.value = settings.gpsUrl?.value || "";
  const currentLogoValue = settings.logoUrl?.value || "";
  settingLogoFileInput.value = "";
  settingLogoFileName.textContent = currentLogoValue
    ? (settings.logoUrl?.fileName || (currentLogoValue.startsWith("data:")
      ? "กำลังใช้โลโก้ที่อัปโหลดไว้"
      : "กำลังใช้โลโก้ที่บันทึกไว้"))
    : "ยังไม่ได้เลือกไฟล์";
  clearImagePreview(settingLogoPreview);
  settingPropertyPolicy.value = settings.propertyPolicy?.value || "";
  if (settingPaymentNote) settingPaymentNote.value = settings.paymentNote.value || "";
  if (settingOwnerLineToId) settingOwnerLineToId.value = settings.lineToId?.value || "";
  const hero = normalizeHeroContent(settings.heroContent || {});
  if (settingHeroTextPill) settingHeroTextPill.value = hero.textPill || "";
  if (settingHeroTextTitle) settingHeroTextTitle.value = hero.textTitle || "";
  if (settingHeroTextBody) settingHeroTextBody.value = hero.textBody || "";
  if (settingHeroCardEyebrow) settingHeroCardEyebrow.value = hero.cardEyebrow || "";
  if (settingHeroCardTitle) settingHeroCardTitle.value = hero.cardTitle || "";
  if (settingHeroCardSubtitle) settingHeroCardSubtitle.value = hero.cardSubtitle || "";
  if (settingHeroTextImageFile) settingHeroTextImageFile.value = "";
  if (settingHeroCardImageFile) settingHeroCardImageFile.value = "";
  if (settingHeroTextImageName) settingHeroTextImageName.textContent = hero.textImage ? "กำลังใช้รูปที่บันทึกไว้" : "ยังไม่ได้เลือกรูป";
  if (settingHeroCardImageName) settingHeroCardImageName.textContent = hero.cardImage ? "กำลังใช้รูปที่บันทึกไว้" : "ยังไม่ได้เลือกรูป";
}

function renderAddonSettingsForm() {
  if (!settingAddonList) return;
  const items = normalizeAddonItems(settings.addons?.items, settings);
  settingAddonList.innerHTML = items.map(item => `
    <div class="setting-addon-row" data-addon-row>
      <input type="hidden" data-addon-id value="${escapeHtml(item.id)}" />
      <div class="field compact">
        <label>ชื่อบริการ</label>
        <input type="text" data-addon-name value="${escapeHtml(item.name)}" placeholder="เช่น หมูกระทะ" />
      </div>
      <div class="field compact">
        <label>ราคา</label>
        <input type="number" data-addon-price min="0" value="${Number(item.price || 0)}" />
      </div>
      <div class="field compact">
        <label>หน่วย</label>
        <input type="text" data-addon-unit value="${escapeHtml(item.unit || "รายการ")}" placeholder="ชุด / เตียง" />
      </div>
      <label class="setting-addon-active">
        <input type="checkbox" data-addon-active ${item.active !== false ? "checked" : ""} />
        เปิดใช้
      </label>
      <button type="button" class="setting-addon-remove" onclick="removeSettingAddonRow(this)">ลบ</button>
    </div>
  `).join("");
}

function addSettingAddonRow() {
  if (!settingAddonList) return;
  const row = document.createElement("div");
  row.className = "setting-addon-row";
  row.dataset.addonRow = "";
  row.innerHTML = `
    <input type="hidden" data-addon-id value="addon_${Date.now()}" />
    <div class="field compact">
      <label>ชื่อบริการ</label>
      <input type="text" data-addon-name placeholder="เช่น อาหารเช้า" />
    </div>
    <div class="field compact">
      <label>ราคา</label>
      <input type="number" data-addon-price min="0" value="0" />
    </div>
    <div class="field compact">
      <label>หน่วย</label>
      <input type="text" data-addon-unit value="รายการ" />
    </div>
    <label class="setting-addon-active">
      <input type="checkbox" data-addon-active checked />
      เปิดใช้
    </label>
    <button type="button" class="setting-addon-remove" onclick="removeSettingAddonRow(this)">ลบ</button>
  `;
  settingAddonList.appendChild(row);
  row.querySelector("[data-addon-name]")?.focus();
}

function removeSettingAddonRow(button) {
  button?.closest("[data-addon-row]")?.remove();
}

function getAddonSettingsFromForm() {
  const rows = Array.from(settingAddonList?.querySelectorAll("[data-addon-row]") || []);
  return normalizeAddonItems(rows.map((row, index) => ({
    id: row.querySelector("[data-addon-id]")?.value || `addon_${index + 1}`,
    name: row.querySelector("[data-addon-name]")?.value || "",
    price: Number(row.querySelector("[data-addon-price]")?.value || 0),
    unit: row.querySelector("[data-addon-unit]")?.value || "รายการ",
    active: row.querySelector("[data-addon-active]")?.checked !== false
  })), settings);
}

function syncLegacyAddonPrice(addonId, price) {
  const row = Array.from(settingAddonList?.querySelectorAll("[data-addon-row]") || [])
    .find(item => item.querySelector("[data-addon-id]")?.value === addonId);
  if (!row) return;
  const input = row.querySelector("[data-addon-price]");
  if (input) input.value = Number(price || 0);
}

async function saveSettings(event) {
  event.preventDefault();
  showLoadingPopup("กำลังบันทึกการตั้งค่า");

  const logoFile = settingLogoFileInput.files && settingLogoFileInput.files[0];
  const heroTextImageFile = settingHeroTextImageFile?.files && settingHeroTextImageFile.files[0];
  const heroCardImageFile = settingHeroCardImageFile?.files && settingHeroCardImageFile.files[0];

  let logoSetting = {
    label: "โลโก้",
    value: settings.logoUrl?.value || DEFAULT_SETTINGS.logoUrl.value
  };

  if (logoFile) {
    const maxLogoSize = 2 * 1024 * 1024;

    if (logoFile.size > maxLogoSize) {
      showToast("ไฟล์โลโก้ต้องมีขนาดไม่เกิน 2MB");
      hideLoadingPopup();
      return;
    }

    if (!logoFile.type.startsWith("image/")) {
      showToast("กรุณาอัปโหลดไฟล์รูปภาพโลโก้เท่านั้น");
      hideLoadingPopup();
      return;
    }

    let logoBase64 = "";
    try {
      logoBase64 = await fileToBase64(logoFile);
    } catch (error) {
      console.error(error);
      showToast("อ่านไฟล์โลโก้ไม่สำเร็จ");
      hideLoadingPopup();
      return;
    }

    logoSetting = {
      label: "โลโก้",
      value: `data:${logoFile.type};base64,${logoBase64}`,
      fileName: logoFile.name,
      mimeType: logoFile.type,
      base64: logoBase64
    };
  }

  const buildHeroImageSetting = async (file, currentValue, label) => {
    if (!file) return currentValue || "";
    const maxHeroImageSize = 5 * 1024 * 1024;
    if (file.size > maxHeroImageSize) {
      showToast("Hero image must be smaller than 5MB");
      hideLoadingPopup();
      return null;
    }
    if (!file.type.startsWith("image/")) {
      showToast("Please upload image files only");
      hideLoadingPopup();
      return null;
    }
    let base64 = "";
    try {
      base64 = await fileToBase64(file);
    } catch (error) {
      console.error(error);
      showToast("อ่านไฟล์รูป Hero ไม่สำเร็จ");
      hideLoadingPopup();
      return null;
    }
    return {
      label,
      fileName: file.name,
      mimeType: file.type,
      base64
    };
  };

  const currentHero = normalizeHeroContent(settings.heroContent || {});
  const nextHeroTextImage = await buildHeroImageSetting(heroTextImageFile, currentHero.textImage, "Hero text image");
  const nextHeroCardImage = await buildHeroImageSetting(heroCardImageFile, currentHero.cardImage, "Hero card image");
  if (nextHeroTextImage === null || nextHeroCardImage === null) {
    hideLoadingPopup();
    return;
  }
  const heroContent = {
    label: "Hero content",
    textPill: settingHeroTextPill?.value.trim() || currentHero.textPill,
    textTitle: settingHeroTextTitle?.value.trim() || currentHero.textTitle,
    textBody: settingHeroTextBody?.value.trim() || currentHero.textBody,
    textImage: nextHeroTextImage,
    cardEyebrow: settingHeroCardEyebrow?.value.trim() || currentHero.cardEyebrow,
    cardTitle: settingHeroCardTitle?.value.trim() || currentHero.cardTitle,
    cardSubtitle: settingHeroCardSubtitle?.value.trim() || currentHero.cardSubtitle,
    cardImage: nextHeroCardImage
  };

  const addonItems = getAddonSettingsFromForm();
  const mookataAddon = addonItems.find(item => item.id === "mookata") || { name: "หมูกระทะ", price: 0 };
  const extraBedAddon = addonItems.find(item => item.id === "extra_bed") || { name: "เตียงเสริม", price: 0 };

  const newSettings = {
    siteName: { label: "ชื่อเว็บไซต์", value: settingSiteName.value.trim() || DEFAULT_SETTINGS.siteName.value },
    logoUrl: logoSetting,
    mookata: { label: mookataAddon.name || "หมูกระทะ", price: Number(mookataAddon.price || 0) },
    extraBed: { label: extraBedAddon.name || "เตียงเสริม", price: Number(extraBedAddon.price || 0) },
    addons: { label: "บริการเสริม", items: addonItems },
    bankName: { label: "ธนาคาร", value: settingBankName.value.trim() },
    bankAccountName: { label: "ชื่อบัญชี", value: settingBankAccountName.value.trim() },
    bankAccountNumber: { label: "เลขบัญชี", value: settingBankAccountNumber.value.trim() },
    promptPayId: { label: "เลขพร้อมเพย์", value: settingPromptPayId?.value.trim() || "" },
    bookingFee: settings.bookingFee || DEFAULT_SETTINGS.bookingFee,
    heroContent,
    pageUrl: { label: "ลิงก์เพจ", value: settingPageUrl.value.trim() },
    gpsUrl: { label: "ลิงก์ GPS", value: settingGpsUrl.value.trim() },
    paymentNote: { label: "หมายเหตุชำระเงิน", value: settingPaymentNote?.value.trim() || "" },
    propertyPolicy: { label: "นโยบายที่พัก", value: settingPropertyPolicy.value.trim() }
  };

  try {
    const result = await apiRequest({ action: "updateSettings", settings: newSettings });
    if (!result.ok) throw new Error(result.message || "บันทึกไม่สำเร็จ");
    settings = normalizeSettings(result.data || newSettings);
    applyBrandAssets(settings);
    renderSettingsForm();
    showToast("บันทึกชื่อเว็บ โลโก้ ราคา และบัญชีโอนแล้ว");
  } catch (error) {
    console.error(error);
    showToast("บันทึกการตั้งค่าไม่สำเร็จ");
  } finally {
    hideLoadingPopup();
  }
}

async function saveOwnerPassword() {
  const ownerPassword = String(settingOwnerPassword?.value || "").trim();
  const confirmPassword = String(settingOwnerPasswordConfirm?.value || "").trim();

  if (!ownerPassword) {
    showToast("Please enter new Owner password");
    settingOwnerPassword?.focus();
    return;
  }

  if (ownerPassword !== confirmPassword) {
    showToast("Owner password confirmation does not match");
    settingOwnerPasswordConfirm?.focus();
    return;
  }

  try {
    const result = await apiRequest({ action: "ownerUpdatePassword", ownerPassword });
    if (!result.ok) throw new Error(result.message || "Save Owner password failed");
    if (settingOwnerPassword) settingOwnerPassword.value = "";
    if (settingOwnerPasswordConfirm) settingOwnerPasswordConfirm.value = "";
    showToast("Owner password saved");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Save Owner password failed");
  }
}

async function saveOwnerLineToId() {
  const lineToId = String(settingOwnerLineToId?.value || "").trim();

  try {
    showLoadingPopup("กำลังบันทึก LINE_TO_ID");
    const result = await apiRequest({ action: "ownerUpdateLineToId", lineToId });
    if (!result.ok) throw new Error(result.message || "Save LINE_TO_ID failed");
    settings = normalizeSettings({
      ...settings,
      lineToId: { label: "Owner LINE_TO_ID", value: result.data?.lineToId || lineToId }
    });
    renderSettingsForm();
    showToast("LINE_TO_ID saved");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Save LINE_TO_ID failed");
  } finally {
    hideLoadingPopup();
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
  const files = Array.from(roomImageFileInput.files || []).slice(0, 5);
  roomImageFileName.textContent = files.length ? `${files.length} รูปที่เลือก` : "ยังไม่ได้เลือกไฟล์";
  updateImagePreview(roomImageFileInput, roomImagePreview);
}

function updateLogoChoiceState() {
  const file = settingLogoFileInput.files && settingLogoFileInput.files[0];
  settingLogoFileName.textContent = file ? file.name : (settings.logoUrl?.value ? "กำลังใช้โลโก้ที่บันทึกไว้" : "ยังไม่ได้เลือกไฟล์");
  updateImagePreview(settingLogoFileInput, settingLogoPreview);
}

function updateHeroImageChoiceState(input, label, currentValue) {
  const file = input?.files && input.files[0];
  if (label) label.textContent = file ? file.name : (currentValue ? "กำลังใช้รูปที่บันทึกไว้" : "ยังไม่ได้เลือกรูป");
}

function clearImagePreview(preview) {
  if (!preview) return;
  if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
  preview.removeAttribute("src");
  preview.dataset.objectUrl = "";
  preview.classList.add("hidden");
}

function updateImagePreview(input, preview) {
  const file = input?.files && input.files[0];

  if (!preview) return;

  clearImagePreview(preview);

  if (!file || !file.type.startsWith("image/")) return;

  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.dataset.objectUrl = objectUrl;
  preview.classList.remove("hidden");
}

async function createRoom(event) {
  event.preventDefault();

  const imageUrl = roomImageInput.value.trim();
  const imageFiles = Array.from(roomImageFileInput.files || []).slice(0, 5);

  if (!imageFiles.length) {
    showToast("กรุณาอัปโหลดรูปห้องพัก");
    return;
  }

  let uploadedImages = [];

  if (imageFiles.length) {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    for (const file of imageFiles) {
      if (file.size > maxSize) {
        showToast("รูปภาพต้องมีขนาดไม่เกิน 5MB");
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        showToast("กรุณาใช้รูป JPG, PNG หรือ WEBP เท่านั้น");
        return;
      }

      uploadedImages.push({
        fileName: file.name,
        mimeType: file.type,
        base64: await fileToBase64(file)
      });
    }
  }

  const room = {
    name: roomNameInput.value.trim(),
    price: Number(roomPriceInput.value || 0),
    detail: roomDetailInput.value.trim(),
    image: imageUrl,
    imageUpload: uploadedImages[0] || null,
    galleryImageUploads: uploadedImages,
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
    clearImagePreview(roomImagePreview);
    await loadDashboard();
    showToast("เพิ่มห้องพักแล้ว");
  } catch (error) {
    console.error(error);
    showToast(error.message || "เพิ่มห้องพักไม่สำเร็จ");
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
      <td class="room-detail-owner-cell">
        <textarea class="inline-input inline-textarea" id="room-detail-${room.id}" rows="6">${escapeHtml(room.detail || "")}</textarea>
      </td>
      <td class="room-image-owner-cell">
        ${renderOwnerImageBlock(room.image || "", room.name)}
        <label class="inline-file-box" for="room-image-file-${room.id}">
          <input type="file" id="room-image-file-${room.id}" accept="image/jpeg,image/png,image/webp" multiple onchange="updateRoomTableFileName('${room.id}')" />
          <span>อัปโหลดรูปใหม่</span>
          <small id="room-image-file-name-${room.id}">ยังไม่ได้เลือกไฟล์</small>
          <img class="upload-preview table-upload-preview hidden" id="room-image-preview-${room.id}" alt="ตัวอย่างรูปใหม่" />
        </label>
      </td>
      <td>
        <span class="status ${isRoomOpenOnDate(room, toDateKey(new Date())) ? "confirmed" : "cancelled"}">${roomStatusText(room)}</span>
      </td>
      <td>
        <div class="action-row">
          <button onclick="saveRoom('${room.id}')">บันทึก</button>
          <button onclick="toggleRoom('${room.id}', ${isRoomOpenOnDate(room, toDateKey(new Date())) ? "false" : "true"})">${isRoomOpenOnDate(room, toDateKey(new Date())) ? "ปิด" : "เปิด"}</button>
          <button class="danger-btn" onclick="deleteRoom('${room.id}')">ลบ</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function updateRoomTableFileName(id) {
  const input = document.getElementById(`room-image-file-${id}`);
  const label = document.getElementById(`room-image-file-name-${id}`);
  const preview = document.getElementById(`room-image-preview-${id}`);
  const files = Array.from(input?.files || []).slice(0, 5);
  if (label) label.textContent = files.length ? `${files.length} รูปที่เลือก` : "ยังไม่ได้เลือกไฟล์";
  updateImagePreview(input, preview);
}

function renderRoomTable() {
  if (!rooms.length) {
    roomTable.innerHTML = `<div class="empty">ยังไม่มีห้องพัก</div>`;
    return;
  }

  const todayKey = toDateKey(new Date());

  roomTable.innerHTML = rooms.map(room => {
    const isOpen = isRoomOpenOnDate(room, todayKey);
    const closedUntil = String(room.closedUntil || "").trim();

    return `
      <article class="room-owner-card ${isOpen ? "" : "is-closed"}">
        <div class="room-owner-media">
          ${renderOwnerImageBlock(room.image || "", room.name)}
        </div>

        <div class="room-owner-main">
          <div class="room-owner-top">
            <div class="room-owner-title">
              <span>ห้องพัก</span>
              <input class="inline-input room-title-input" id="room-name-${room.id}" value="${escapeHtml(room.name)}" />
            </div>
            <label class="room-owner-field price-field room-top-price-field">
              <span>เธฃเธฒเธเธฒ / เธเธทเธ</span>
              <input class="inline-input" type="number" id="room-price-${room.id}" value="${Number(room.price || 0)}" />
            </label>
            <label class="room-owner-field discount-field room-top-discount-field">
              <span>&#3619;&#3634;&#3588;&#3634;&#3627;&#3621;&#3633;&#3591;&#3621;&#3604;</span>
              <input class="inline-input" type="number" min="0" id="room-discount-price-${room.id}" value="${Number(room.discountPrice || 0) || ""}" placeholder="0" />
            </label>
            <span class="status ${isOpen ? "confirmed" : "cancelled"}">${roomStatusText(room)}</span>
          </div>

          <div class="room-owner-fields">
            <label class="room-owner-field price-field old-price-field">
              <span>ราคา / คืน</span>
              <input class="inline-input" type="number" id="room-price-${room.id}" value="${Number(room.price || 0)}" />
            </label>

            <label class="room-owner-field detail-field">
              <span>รายละเอียด</span>
              <textarea class="inline-input inline-textarea" id="room-detail-${room.id}" rows="5">${escapeHtml(room.detail || "")}</textarea>
            </label>

            <div class="room-owner-field upload-field">
              <span>รูปภาพ</span>
              <label class="inline-file-box" for="room-image-file-${room.id}">
                <input type="file" id="room-image-file-${room.id}" accept="image/jpeg,image/png,image/webp" multiple onchange="updateRoomTableFileName('${room.id}')" />
                <span>อัปโหลดรูปใหม่</span>
                <small id="room-image-file-name-${room.id}">ยังไม่ได้เลือกไฟล์</small>
                <img class="upload-preview table-upload-preview hidden" id="room-image-preview-${room.id}" alt="ตัวอย่างรูปใหม่" />
              </label>
              <div class="room-gallery-count">${getRoomGalleryImages(room).length} / 5 photos</div>
            </div>
          </div>

          ${closedUntil && !isOpen ? `<div class="room-closed-note">ปิดการจองถึง ${formatThaiDate(closedUntil)}</div>` : ""}

          <div class="room-card-actions">
            <button type="button" class="save-room-btn" onclick="saveRoom('${room.id}')">บันทึก</button>
            <button type="button" class="toggle-room-btn ${isOpen ? "close-mode" : "open-mode"}" onclick="${isOpen ? `openRoomCloseModal('${room.id}')` : `toggleRoom('${room.id}', true)`}">
              ${isOpen ? "ปิดห้อง" : "เปิดใช้งาน"}
            </button>
            <button type="button" class="danger-btn" onclick="deleteRoom('${room.id}')">ลบ</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function saveRoom(id) {
  const imageInput = document.getElementById(`room-image-file-${id}`);
  const imageFiles = Array.from(imageInput?.files || []).slice(0, 5);
  const room = {
    name: document.getElementById(`room-name-${id}`).value.trim(),
    price: Number(document.getElementById(`room-price-${id}`).value || 0),
    discountPrice: Number(document.getElementById(`room-discount-price-${id}`)?.value || 0),
    detail: document.getElementById(`room-detail-${id}`).value.trim()
  };

  if (imageFiles.length) {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const uploadedImages = [];

    for (const file of imageFiles) {
      if (file.size > maxSize) {
        showToast("รูปภาพต้องมีขนาดไม่เกิน 5MB");
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        showToast("กรุณาใช้รูป JPG, PNG หรือ WEBP เท่านั้น");
        return;
      }

      uploadedImages.push({
        fileName: file.name,
        mimeType: file.type,
        base64: await fileToBase64(file)
      });
    }

    room.imageUpload = uploadedImages[0];
    room.galleryImageUploads = uploadedImages;
  }

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
    const roomUpdate = { active, closedUntil: "" };

    if (!active) {
      const todayKey = toDateKey(new Date());
      const closedUntil = prompt("ต้องการปิดห้องนี้ถึงวันที่เท่าไหร่? (รูปแบบ YYYY-MM-DD)", todayKey);

      if (closedUntil === null) return;

      const cleanDate = String(closedUntil || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        showToast("กรุณาใส่วันที่รูปแบบ YYYY-MM-DD เช่น 2026-06-24");
        return;
      }

      if (cleanDate < todayKey) {
        showToast("วันที่ปิดต้องไม่เป็นวันย้อนหลัง");
        return;
      }

      roomUpdate.closedUntil = cleanDate;
    }

    const result = await apiRequest({ action: "updateRoom", id, room: roomUpdate });
    if (!result.ok) throw new Error(result.message || "เปลี่ยนสถานะไม่สำเร็จ");
    await loadDashboard();
    showToast(active ? "เปิดห้องให้จองแล้ว" : `ปิดห้องพักถึง ${formatThaiDate(roomUpdate.closedUntil)} แล้ว`);
  } catch (error) {
    console.error(error);
    showToast("เปลี่ยนสถานะห้องไม่สำเร็จ");
  }
}

function openRoomCloseModal(id) {
  const room = rooms.find(item => String(item.id) === String(id));
  if (!room || !roomCloseModal) return;

  const today = new Date();
  const currentClosedUntil = String(room.closedUntil || "").trim();
  const selected = currentClosedUntil && currentClosedUntil >= toDateKey(today) ? fromDateKey(currentClosedUntil) : today;

  roomCloseTargetId = id;
  roomCloseSelectedDate = toDateKey(selected);
  roomCloseCalendarDate = new Date(selected.getFullYear(), selected.getMonth(), 1);

  if (roomCloseTitle) roomCloseTitle.textContent = `ปิดห้อง ${room.name || ""}`;
  if (roomCloseNote) roomCloseNote.textContent = "เลือกวันที่สุดท้ายที่ต้องการปิดห้อง หลังจากวันนั้นลูกค้าจะกลับมาจองได้เอง";

  roomCloseModal.classList.remove("hidden");
  renderRoomCloseCalendar();
}

function cancelRoomCloseModal() {
  if (roomCloseModal) roomCloseModal.classList.add("hidden");
  roomCloseTargetId = "";
  roomCloseSelectedDate = "";
}

function selectRoomCloseDate(dateKey) {
  roomCloseSelectedDate = dateKey;
  renderRoomCloseCalendar();
}

function renderRoomCloseCalendar() {
  if (!roomCloseCalendarGrid || !roomCloseMonthText) return;

  const todayKey = toDateKey(new Date());
  const year = roomCloseCalendarDate.getFullYear();
  const month = roomCloseCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells = [];

  roomCloseMonthText.textContent = firstDay.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric"
  });

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    cells.push(`<button type="button" class="room-close-day blank" disabled></button>`);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    const isPast = key < todayKey;
    const isSelected = key === roomCloseSelectedDate;
    const isToday = key === todayKey;
    const classes = ["room-close-day"];
    if (isSelected) classes.push("selected");
    if (isToday) classes.push("today");
    if (isPast) classes.push("past");

    cells.push(`
      <button type="button" class="${classes.join(" ")}" ${isPast ? "disabled" : `onclick="selectRoomCloseDate('${key}')"`}>
        <strong>${day}</strong>
        ${isToday ? "<span>วันนี้</span>" : ""}
      </button>
    `);
  }

  roomCloseCalendarGrid.innerHTML = cells.join("");
  if (roomCloseSelectedText) roomCloseSelectedText.textContent = roomCloseSelectedDate ? formatThaiDate(roomCloseSelectedDate) : "ยังไม่ได้เลือก";
  if (roomCloseConfirmBtn) roomCloseConfirmBtn.disabled = !roomCloseSelectedDate;
}

async function confirmRoomCloseModal() {
  if (!roomCloseTargetId || !roomCloseSelectedDate) {
    showToast("กรุณาเลือกวันที่ต้องการปิดห้อง");
    return;
  }

  await toggleRoom(roomCloseTargetId, false, roomCloseSelectedDate);
  cancelRoomCloseModal();
}

async function toggleRoom(id, active, closedUntilValue = "") {
  try {
    const todayKey = toDateKey(new Date());
    const roomUpdate = { active, closedUntil: "" };

    if (!active) {
      const cleanDate = String(closedUntilValue || "").trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        openRoomCloseModal(id);
        return;
      }

      if (cleanDate < todayKey) {
        showToast("วันที่ปิดต้องไม่เป็นวันย้อนหลัง");
        return;
      }

      roomUpdate.closedUntil = cleanDate;
    }

    const result = await apiRequest({ action: "updateRoom", id, room: roomUpdate });
    if (!result.ok) throw new Error(result.message || "เปลี่ยนสถานะไม่สำเร็จ");
    await loadDashboard();
    showToast(active ? "เปิดห้องให้จองแล้ว" : `ปิดห้องพักถึง ${formatThaiDate(roomUpdate.closedUntil)} แล้ว`);
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

function formatOwnerShortDate(value) {
  if (!value) return "-";
  const date = fromDateKey(value);
  if (Number.isNaN(date.getTime())) return String(value || "-");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function isRoomOpenOnDate(room, dateKey) {
  if (!room) return false;
  if (room.active) return true;

  const closedUntil = String(room.closedUntil || "").trim();
  if (!closedUntil) return false;

  return String(dateKey || toDateKey(new Date())) > closedUntil;
}

function roomStatusText(room) {
  if (isRoomOpenOnDate(room, toDateKey(new Date()))) return "เปิดจอง";

  const closedUntil = String(room.closedUntil || "").trim();
  return closedUntil ? `ปิดถึง ${formatThaiDate(closedUntil)}` : "ปิดไว้";
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
  return rooms.filter(room => isRoomOpenOnDate(room, dateKey) && !bookedRoomIds.has(String(room.id)));
}

function getBookingAddonItems(booking = {}) {
  const items = normalizeBookingAddonItems(booking.addonItems);
  if (items.length) return items;

  const fallback = [];
  const mookataQty = Number(booking.mookataQty || 0);
  const extraBedQty = Number(booking.extraBedQty || 0);

  if (mookataQty > 0) {
    fallback.push({
      id: "mookata",
      name: "หมูกระทะ",
      unit: "ชุด",
      qty: mookataQty,
      price: Number(booking.mookataPrice || 0),
      total: mookataQty * Number(booking.mookataPrice || 0)
    });
  }

  if (extraBedQty > 0) {
    fallback.push({
      id: "extra_bed",
      name: "เตียงเสริม",
      unit: "เตียง",
      qty: extraBedQty,
      price: Number(booking.extraBedPrice || 0),
      total: extraBedQty * Number(booking.extraBedPrice || 0)
    });
  }

  return fallback;
}

function getBookingAddonLines(booking = {}) {
  return getBookingAddonItems(booking).map(item => {
    const qtyText = Number(item.qty || 0) > 1 ? ` ${item.qty} ${item.unit || "รายการ"}` : "";
    return `${item.name}${qtyText} ${formatMoney(item.total || (item.qty * item.price))}`;
  });
}

function renderOwnerCalendar() {
  if (!ownerCalendarGrid) return;

  const year = ownerCalendarDate.getFullYear();
  const month = ownerCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  ownerCalendarMonthText.textContent = firstDay.toLocaleDateString("th-TH", {
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
    if (key === ownerSelectedDateKey) classes.push("selected-start");

    const badge = hasBooking ? `${dayBookings.length} จอง` : "ว่าง";
    const roomText = `${availableRoomCount} ห้องว่าง`;

    cells.push(`
      <button type="button" class="${classes.join(" ")}" onclick="selectOwnerCalendarDate('${key}')">
        <strong class="owner-day-number">${day}</strong>
        <span class="owner-day-status">${badge}</span>
        <small class="owner-day-room">${roomText}</small>
      </button>
    `);
  }

  ownerCalendarGrid.innerHTML = cells.join("");
}

function selectOwnerCalendarDate(dateKey) {
  ownerSelectedDateKey = dateKey;
  renderOwnerCalendar();
  renderDateDetails(dateKey);
}

function renderDateDetails(dateKey) {
  if (!ownerDateDetailList) return;

  if (!dateKey) {
    ownerSelectedDateText.textContent = "ยังไม่เลือกวันที่";
    ownerDateDetailList.innerHTML = `<div class="empty">กดวันที่ในปฏิทินเพื่อดูรายละเอียดลูกค้าที่จอง</div>`;
    return;
  }

  const dayBookings = getBookingsForDate(dateKey);
  const availableRooms = getAvailableRoomsForDate(dateKey);

  ownerSelectedDateText.textContent = formatThaiDate(dateKey);

  const availableHtml = `
    <div class="date-available-box">
      <b>ห้องว่างวันนี้: ${availableRooms.length} ห้อง</b>
      <span>${availableRooms.length ? availableRooms.map(room => escapeHtml(room.name)).join(", ") : "ไม่มีห้องว่าง"}</span>
    </div>
  `;

  if (!dayBookings.length) {
    ownerDateDetailList.innerHTML = `
      ${availableHtml}
      <div class="empty">วันนี้ยังไม่มีลูกค้าจอง</div>
    `;
    return;
  }

  const bookingHtml = dayBookings.map(booking => {
    const addons = getBookingAddonLines(booking);
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
            <small>${escapeHtml(formatOwnerShortDate(booking.checkIn))} → ${escapeHtml(formatOwnerShortDate(booking.checkOut))}</small>
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
        ${booking.slipUrl ? `<button type="button" class="slip-link" data-slip-url="${escapeHtml(booking.slipUrl)}" onclick="openSlipImagePopup(this.dataset.slipUrl)">สลิปการโอน</button>` : ""}
      </article>
    `;
  }).join("");

  ownerDateDetailList.innerHTML = availableHtml + bookingHtml;
}

function renderSlipCheck(label, check) {
  const ok = check?.ok === true;
  const title = check?.actual && check?.actual !== "-"
    ? ` title="พบ: ${escapeHtml(check.actual)}"`
    : "";

  return `
    <div class="slip-check-row"${title}>
      <span>${escapeHtml(label)}</span>
      <b class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✕"}</b>
    </div>
  `;
}

function renderSlipVerifyStatus(booking = {}) {
  const status = String(booking.slipVerifyStatus || "not_checked");
  const checks = booking.slipVerifyChecks || {};
  const duplicateSlipHtml = checks.duplicate?.ok === false
    ? renderSlipCheck("สลิปซ้ำ", checks.duplicate)
    : "";

  if (!booking.slipUrl) {
    return `<small class="slip-verify muted">ยังไม่มีสลิปให้ตรวจ</small>`;
  }

  if (status === "not_checked") {
    return `<small class="slip-verify pending">กำลังรอตรวจอัตโนมัติ</small>`;
  }

  if (status === "error") {
    return `
      <small class="slip-verify failed">ตรวจสลิปไม่ได้</small>
    `;
  }

  return `
    <div class="slip-checklist ${status === "passed" ? "passed" : "failed"}">
      ${renderSlipCheck("เลขบัญชี/พร้อมเพย์", checks.accountNumber)}
      ${renderSlipCheck("ชื่อบัญชี", checks.accountName)}
      ${renderSlipCheck("เวลา", checks.transferTime)}
      ${renderSlipCheck("จำนวนเงิน", checks.amount)}
      ${duplicateSlipHtml}
    </div>
  `;
}

function renderPaymentSlipPreview(booking = {}) {
  const slipUrl = String(booking.slipUrl || "").trim();

  if (!slipUrl) {
    return `<div class="owner-slip-empty">ยังไม่มีสลิป</div>`;
  }

  return `
    <button type="button" class="owner-slip-preview" data-slip-url="${escapeHtml(slipUrl)}" onclick="openSlipImagePopup(this.dataset.slipUrl)">
      <img src="${escapeHtml(slipUrl)}" alt="สลิปการโอนของลูกค้า" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('is-broken'); this.remove();" />
    </button>
  `;
}

function ensureSlipImagePopup() {
  let modal = document.getElementById("slipImagePopup");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "slipImagePopup";
  modal.className = "modal-overlay slip-image-popup hidden";
  modal.innerHTML = `
    <div class="slip-image-popup-card">
      <button type="button" class="modal-close-btn slip-image-close" onclick="closeSlipImagePopup()" aria-label="ปิด">✕</button>
      <img id="slipImagePopupImg" alt="สลิปการโอนของลูกค้า" />
    </div>
  `;
  modal.addEventListener("click", event => {
    if (event.target.id === "slipImagePopup") closeSlipImagePopup();
  });
  document.body.appendChild(modal);
  return modal;
}

function openSlipImagePopup(url) {
  const modal = ensureSlipImagePopup();
  const img = document.getElementById("slipImagePopupImg");
  if (img) img.src = url;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeSlipImagePopup() {
  const modal = document.getElementById("slipImagePopup");
  if (modal) modal.classList.add("hidden");
  const img = document.getElementById("slipImagePopupImg");
  if (img) img.removeAttribute("src");
  document.body.classList.remove("modal-open");
}

function autoVerifyPendingSlips() {
  const pending = cachedBookings
    .filter(booking => booking.slipUrl && String(booking.slipVerifyStatus || "not_checked") === "not_checked")
    .slice(0, 5);

  if (!pending.length) return;

  Promise.allSettled(pending.map(booking => apiRequest({ action: "verifySlip", id: booking.id })))
    .then(results => {
      if (results.some(result => result.status === "fulfilled")) {
        return loadDashboard(true);
      }
      return null;
    })
    .catch(error => console.warn("Auto verify pending slips failed", error));
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
    bookingTable.innerHTML = `<tr><td colspan="5" class="empty">ยังไม่มีรายการจอง</td></tr>`;
    return;
  }

  bookingTable.innerHTML = filtered.map(booking => {
    const addonLines = getBookingAddonLines(booking);
    const slipVerifyHtml = renderSlipVerifyStatus(booking);
    const slipPreviewHtml = renderPaymentSlipPreview(booking);
    const guestCount = Number(booking.guestCount || 1);
    const grandTotal = Number(booking.grandTotal || booking.total || 0);
    const roomTotal = Number(booking.roomTotal || 0);
    return `
      <tr class="booking-detail-row">
        <td class="booking-guest-cell">
          <div class="booking-primary">
            <b>${escapeHtml(booking.name || "-")}</b>
            <span class="booking-code">${escapeHtml(booking.bookingCode || booking.id || "-")}</span>
          </div>
          <div class="booking-contact-list">
            <span>${escapeHtml(booking.phone || "-")}</span>
            ${booking.email ? `<span>${escapeHtml(booking.email)}</span>` : ""}
          </div>
          ${booking.note ? `<div class="booking-note-box">${escapeHtml(booking.note)}</div>` : ""}
        </td>
        <td class="booking-stay-cell">
          <div class="booking-room-title">${escapeHtml(booking.roomName || "-")}</div>
          <div class="booking-date-range">
            <span>${escapeHtml(formatOwnerShortDate(booking.checkIn))}</span>
            <i>→</i>
            <span>${escapeHtml(formatOwnerShortDate(booking.checkOut))}</span>
          </div>
          <div class="booking-meta-grid">
            <span>${Number(booking.nights || 0)} คืน</span>
            <span>${guestCount} คน</span>
          </div>
          <div class="booking-cost-lines">
            <span><em>ค่าห้อง</em><b>${formatMoney(roomTotal)}</b></span>
            <span>
              <em>ค่าบริการเสริม</em>
              <b>${addonLines.length ? escapeHtml(addonLines.join(", ")) : "ไม่มี"}</b>
            </span>
            <span class="booking-grand-line"><em>ยอดรวม</em><b>${formatMoney(grandTotal)}</b></span>
          </div>
        </td>
        <td class="booking-payment-cell">
          <div class="owner-payment-cell">
            <b>${escapeHtml(booking.paymentStatus || "รอชำระเงิน")}</b>
            ${slipPreviewHtml}
            ${slipVerifyHtml}
          </div>
        </td>
        <td class="booking-status-cell">
          <span class="status ${statusClass(booking.status)}">${escapeHtml(booking.status || "-")}</span>
        </td>
        <td class="booking-actions-cell">
          <div class="action-row">
            ${(() => {
              const confirmed = booking.status === "ยืนยันแล้ว" || booking.status === "ชำระแล้ว";
              const cancelled = booking.status === "ยกเลิก";
              if (confirmed) return '<span class="badge-confirmed">✅ ยืนยันแล้ว</span>';
              if (cancelled) return '<span class="badge-cancelled">❌ ยกเลิกแล้ว</span>';
              return `
                <button onclick="updateStatus('${booking.id}', 'ยืนยันแล้ว')" class="btn-confirm">ยืนยัน</button>
                <button onclick="updateStatus('${booking.id}', 'ยกเลิก')" class="btn-cancel">ยกเลิก</button>
              `;
            })()}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function updateStatus(id, status) {
  try {
    const result = await apiRequest({ action: "updateStatus", id, status });
    if (!result.ok) {
      showToast(result.message || "เปลี่ยนสถานะไม่สำเร็จ");
      return;
    }
    await loadDashboard(true);
    showToast(status === "ยืนยันแล้ว" ? "✅ ยืนยันการจองแล้ว" : `เปลี่ยนสถานะเป็น ${status}`);
  } catch (error) {
    console.error(error);
    showToast("เปลี่ยนสถานะไม่สำเร็จ");
  }
}

async function verifySlip(id) {
  if (!id) return;

  try {
    showLoadingPopup("กำลังตรวจสอบสลิปกับ EasySlip");
    const result = await apiRequest({ action: "verifySlip", id });
    await loadDashboard();
    closeLoadingPopup();

    const data = result?.data || {};
    showToast(data.passed ? "ตรวจสลิปผ่าน" : (data.message || "ตรวจสลิปไม่ผ่าน"));
  } catch (error) {
    console.error(error);
    closeLoadingPopup();
    showToast(error.message || "ตรวจสลิปไม่สำเร็จ");
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
    "บริการเสริม", "ค่าห้อง", "ค่าบริการเสริม", "ค่าจอง", "ยอดรวม", "วิธีชำระ", "สถานะชำระ", "ไฟล์สลิป",
    "ลิงก์สลิป", "สถานะจอง", "หมายเหตุ"
  ];

  const rows = cachedBookings.map(b => [
    b.bookingCode, b.name, b.phone, b.email, b.roomName, b.checkIn, b.checkOut, b.nights, b.guestCount,
    b.mookataQty, b.mookataPrice, b.extraBedQty, b.extraBedPrice,
    getBookingAddonLines(b).join(", "), b.roomTotal, b.addonTotal, b.bookingFee, b.grandTotal, b.paymentMethod, b.paymentStatus,
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
settingHeroTextImageFile?.addEventListener("change", () => updateHeroImageChoiceState(settingHeroTextImageFile, settingHeroTextImageName, settings.heroContent?.textImage));
settingHeroCardImageFile?.addEventListener("change", () => updateHeroImageChoiceState(settingHeroCardImageFile, settingHeroCardImageName, settings.heroContent?.cardImage));
addSettingAddonBtn?.addEventListener("click", addSettingAddonRow);
settingMookataPrice?.addEventListener("input", () => syncLegacyAddonPrice("mookata", settingMookataPrice.value));
settingExtraBedPrice?.addEventListener("input", () => syncLegacyAddonPrice("extra_bed", settingExtraBedPrice.value));

if (ownerPrevMonthBtn && ownerNextMonthBtn) {
  ownerPrevMonthBtn.addEventListener("click", () => {
    ownerCalendarDate = new Date(ownerCalendarDate.getFullYear(), ownerCalendarDate.getMonth() - 1, 1);
    renderOwnerCalendar();
  });

  ownerNextMonthBtn.addEventListener("click", () => {
    ownerCalendarDate = new Date(ownerCalendarDate.getFullYear(), ownerCalendarDate.getMonth() + 1, 1);
    renderOwnerCalendar();
  });
}

if (roomClosePrevBtn && roomCloseNextBtn) {
  roomClosePrevBtn.addEventListener("click", () => {
    roomCloseCalendarDate = new Date(roomCloseCalendarDate.getFullYear(), roomCloseCalendarDate.getMonth() - 1, 1);
    renderRoomCloseCalendar();
  });

  roomCloseNextBtn.addEventListener("click", () => {
    roomCloseCalendarDate = new Date(roomCloseCalendarDate.getFullYear(), roomCloseCalendarDate.getMonth() + 1, 1);
    renderRoomCloseCalendar();
  });
}

document.addEventListener("keydown", event => {
  const slipImagePopup = document.getElementById("slipImagePopup");
  if (event.key === "Escape" && slipImagePopup && !slipImagePopup.classList.contains("hidden")) {
    closeSlipImagePopup();
    return;
  }

  if (event.key === "Escape" && roomCloseModal && !roomCloseModal.classList.contains("hidden")) {
    cancelRoomCloseModal();
  }
});



// ======= CREDIT SYSTEM (Owner) - v2 =======

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
let topupModalScrollY = 0;

function lockTopupPageScroll() {
  topupModalScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add("topup-modal-open");
  document.body.classList.add("topup-modal-open");
  document.body.style.top = `-${topupModalScrollY}px`;
}

function unlockTopupPageScroll() {
  document.documentElement.classList.remove("topup-modal-open");
  document.body.classList.remove("topup-modal-open");
  document.body.style.top = "";
  window.scrollTo(0, topupModalScrollY || 0);
}

function openTopupModal() {
  const reqs = getTopupRequests();
  const pending = reqs.find(r => r.status === "pending");
  const modal = document.getElementById("topupModal");
  lockTopupPageScroll();
  modal.classList.remove("hidden");
  const card = modal.querySelector(".topup-card");
  if (card) card.scrollTop = 0;

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
    const creditsDesc = pkg.type === "yearly" ? "ไม่จำกัด" : `${pkg.credits} เครดิต`;
    const unitCost = pkg.unitCost || "";
    return `
    <div class="topup-pkg-card" id="tpkg_${idKey}" onclick="selectTopupPkg('${idKey}',${pkg.price},'${pkg.label}')">
      <div class="tpkg-label">${pkg.label}</div>
      <div class="tpkg-credits">${creditsDesc}</div>
      <div class="tpkg-price">฿${pkg.price.toLocaleString()}</div>
      ${unitCost ? `<div class="tpkg-rate">${unitCost}</div>` : ""}
    </div>`;
  }).join("");

  // Credit package topups use the admin PromptPay account, separate from the homestay room-payment account.
  const topupSettings = typeof TOPUP_PAYMENT_SETTINGS !== "undefined"
    ? TOPUP_PAYMENT_SETTINGS
    : normalizeSettings(settings || DEFAULT_SETTINGS);
  const bankName   = topupSettings.bankName?.value || "พร้อมเพย์";
  const bankAccName = topupSettings.bankAccountName?.value || "ปรมินทร์ กรกีรติการ";
  const bankAccNo  = topupSettings.bankAccountNumber?.value || "0938160831";
  document.getElementById("topupBankName").textContent   = bankName;
  document.getElementById("topupBankAccName").textContent = bankAccName;
  document.getElementById("topupBankAccNo").textContent   = bankAccNo;
  document.getElementById("topupAmountText").textContent  = "กรุณาเลือกแพ็กเกจ";
  updateTopupPaymentQr(0);

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
  unlockTopupPageScroll();
}

function selectTopupPkg(credits, price, label) {
  selectedTopupPkg = { credits, price, label };
  document.querySelectorAll(".topup-pkg-card").forEach(c => c.classList.remove("selected"));
  const el = document.getElementById("tpkg_" + credits);
  if (el) el.classList.add("selected");
  const desc = credits === "YEAR" ? "ไม่จำกัด" : `${credits} เครดิต`;
  document.getElementById("topupAmountText").textContent = `฿${price.toLocaleString()} (${desc})`;
  updateTopupPaymentQr(price);
  updateTopupSendBtn();
}

function updateTopupPaymentQr(amount = 0) {
  const box = document.getElementById("topupQrBox");
  const img = document.getElementById("topupQrImage");
  const text = document.getElementById("topupQrAmount");

  if (!box || !img) return;

  if (!amount) {
    img.removeAttribute("src");
    box.classList.add("hidden");
    if (text) text.textContent = "เลือกแพ็กเกจก่อน";
    return;
  }

  const topupSettings = typeof TOPUP_PAYMENT_SETTINGS !== "undefined"
    ? TOPUP_PAYMENT_SETTINGS
    : normalizeSettings(settings || DEFAULT_SETTINGS);
  img.src = getPaymentQrImageUrl(topupSettings, amount, 240);
  box.classList.remove("hidden");
  if (text) text.textContent = `ยอดโอน ${formatMoney(amount)}`;
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
  const topupReceiver = typeof TOPUP_PAYMENT_SETTINGS !== "undefined" ? TOPUP_PAYMENT_SETTINGS : {};
  const homestaySlug = typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "";
  const homestayName = String(settings.siteName?.value || homestaySlug || "Homestay").trim();
  const newReq = {
    id: "TR" + Date.now(),
    homestayName,
    homestaySlug,
    credits: selectedTopupPkg.credits,
    price: selectedTopupPkg.price,
    label: selectedTopupPkg.label,
    type: isYearly ? "yearly" : "credit",
    slipBase64: topupSlipBase64,
    slipMime: topupSlipMime,
    slipFilename: topupSlipFilename,
    receiverName: topupReceiver.bankAccountName?.value || "ปรมินทร์ กรกีรติการ",
    receiverPromptPay: topupReceiver.promptPayId?.value || "0938160831",
    status: "pending",
    requestedAt: new Date().toISOString()
  };
  reqs.push(newReq);
  saveTopupRequests(reqs);

  document.getElementById("topupStep1").classList.add("hidden");
  document.getElementById("topupStep2").classList.remove("hidden");
  showToast("ส่งคำขอเรียบร้อย รอ Admin อนุมัติ");
  checkPendingRequest();
}

// Auto-check ถ้า Admin อนุมัติแล้ว (poll ทุก 5 วินาที)
setInterval(async () => {
  const reqs = getTopupRequests();
  const approved = reqs.filter(r => r.status === "approved");
  if (approved.length) {
    for (const r of approved) {
      try {
        r.status = "processing";
        r.processingAt = new Date().toISOString();
        saveTopupRequests(reqs);
        if (r.type === "yearly") {
          const start = new Date().toISOString();
          const expiry = new Date(start);
          expiry.setFullYear(expiry.getFullYear() + 1);
          await loadDashboard(true);
          const result = await apiRequest({
            action: "updatePlan",
            plan: {
              planType: "yearly",
              credits: getCredits(),
              planStartedAt: start,
              planExpiresAt: expiry.toISOString(),
              status: "active"
            }
          });
          if (!result.ok) throw new Error(result.message || "บันทึกแพ็กเกจรายปีไม่สำเร็จ");
          showToast(`✅ Admin อนุมัติแล้ว! เปิดใช้งานแพ็กเกจรายปีสำเร็จ`);
        } else {
          const result = await apiRequest({
            action: "adjustPlanCredits",
            delta: Number(r.credits || 0),
            reason: "owner_topup_approved"
          });
          if (!result.ok) throw new Error(result.message || "บันทึกเครดิตไม่สำเร็จ");
          showToast(`✅ Admin อนุมัติแล้ว! ได้รับ ${r.credits} เครดิต`);
        }
        r.status = "done";
        r.doneAt = new Date().toISOString();
        await loadDashboard(true);
      } catch (error) {
        console.error(error);
        r.status = "approved";
        delete r.processingAt;
        showToast("บันทึกเครดิตไม่สำเร็จ กรุณาลองใหม่");
      }
    }
    saveTopupRequests(reqs);
    renderCreditCard(); renderHeaderCredit();
  }
}, 5000);

function updateHeaderVisibility() {
  document.body.classList.toggle('login-hidden', !ownerDashboard || ownerDashboard.classList.contains('hidden'));
}

loginBtn.addEventListener("click", async () => {
  try {
    const result = await apiRequest({ action: "ownerLogin", password: ownerPassword.value });
    if (!result.ok) {
      showToast("Incorrect password");
      return;
    }
    ownerLoginBox.classList.add("hidden");
    ownerDashboard.classList.remove("hidden");
    updateHeaderVisibility();
    await loadDashboard();
    renderCreditCard(); renderHeaderCredit();
    startPolling();
    showToast("Login successful");
  } catch (error) {
    console.error(error);
    showToast("Incorrect password");
  }
});

logoutBtn.addEventListener("click", () => {
  if (_pollingTimer) clearInterval(_pollingTimer);
  if (_dashboardRefreshTimer) clearInterval(_dashboardRefreshTimer);
  ownerPassword.value = "";
  ownerDashboard.classList.add("hidden");
  ownerLoginBox.classList.remove("hidden");
  updateOwnerLoginHomestayLabel();
  updateHeaderVisibility();
});


// ── Smart Polling ──────────────────────────────────────────────
// เช็คทุก 10 วิ ว่ามีการจองใหม่หรืออัพเดทไหม โดยดึงแค่ record ล่าสุด 1 แถว
let _pollingLastId = null;
let _pollingTimer = null;
let _dashboardRefreshTimer = null;

async function _pollNewBookings() {
  try {
    const slug = typeof getCurrentHomestaySlug === "function" ? getCurrentHomestaySlug() : "";
    if (!slug || ownerDashboard.classList.contains("hidden")) return; // ยังไม่ login ไม่ต้อง poll

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=id,updated_at&order=updated_at.desc&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const latest = rows?.[0];
    const latestKey = latest ? `${latest.id}_${latest.updated_at}` : null;

    if (_pollingLastId === null) {
      // ครั้งแรก — แค่จำค่าไว้ ไม่ต้อง reload
      _pollingLastId = latestKey;
      return;
    }

    if (latestKey && latestKey !== _pollingLastId) {
      _pollingLastId = latestKey;
      await loadDashboard(true); // silent reload ไม่แสดง loading popup
    }
  } catch (_) {
    // silent fail — ไม่ทำให้หน้าพัง
  }
}

function startPolling() {
  if (_pollingTimer) clearInterval(_pollingTimer);
  if (_dashboardRefreshTimer) clearInterval(_dashboardRefreshTimer);
  _pollingLastId = null;
  _pollNewBookings(); // เช็คทันทีครั้งแรก
  _pollingTimer = setInterval(_pollNewBookings, 10000); // ทุก 10 วิ
  _dashboardRefreshTimer = setInterval(() => {
    if (!ownerDashboard || ownerDashboard.classList.contains("hidden")) return;
    if (document.hidden) return;
    const active = document.activeElement;
    const editingForm = active
      && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)
      && (settingsForm?.contains(active) || roomForm?.contains(active) || roomTable?.contains(active));
    if (editingForm) return;
    loadDashboard(true);
  }, 15000);
}
// ────────────────────────────────────────────────────────────────
refreshBtn.addEventListener("click", loadDashboard);
settingsForm.addEventListener("submit", saveSettings);
if (saveOwnerPasswordBtn) saveOwnerPasswordBtn.addEventListener("click", saveOwnerPassword);
if (saveOwnerLineToIdBtn) saveOwnerLineToIdBtn.addEventListener("click", saveOwnerLineToId);
settingOwnerPassword?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveOwnerPassword();
  }
});
settingOwnerPasswordConfirm?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveOwnerPassword();
  }
});
settingOwnerLineToId?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveOwnerLineToId();
  }
});
roomForm.addEventListener("submit", createRoom);
searchBooking.addEventListener("input", renderBookingTable);
statusFilter.addEventListener("change", renderBookingTable);
exportCsvBtn.addEventListener("click", exportCsv);

updateHeaderVisibility();

document.addEventListener("DOMContentLoaded", function(){
  applyBrandAssets(normalizeSettings(typeof localGetSettings === "function" ? localGetSettings() : DEFAULT_SETTINGS));
  updateOwnerLoginHomestayLabel();
  syncOwnerPlanOnPageLoad();
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
    return b.checkIn === dateKey && getBookingAddonItems(b).length > 0;
  });

  if (!bookings.length) {
    body.innerHTML = '<div class="prep-empty">✅ ไม่มีรายการที่ต้องเตรียม</div>';
    return;
  }

  body.innerHTML = bookings.map(b => {
    const addons = getBookingAddonItems(b).map(item =>
      '<span class="prep-addon-tag">' +
      escapeHtml(item.name + ' ' + item.qty + ' ' + (item.unit || 'รายการ')) +
      '</span>'
    );
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
