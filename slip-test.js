const slipTestForm = document.getElementById("slipTestForm");
const homestaySlugInput = document.getElementById("homestaySlug");
const bookingCodeInput = document.getElementById("bookingCode");
const grandTotalInput = document.getElementById("grandTotal");
const bankAccountNameInput = document.getElementById("bankAccountName");
const bankAccountNumberInput = document.getElementById("bankAccountNumber");
const slipFileInput = document.getElementById("slipFile");
const runTestBtn = document.getElementById("runTestBtn");
const fillSettingsBtn = document.getElementById("fillSettingsBtn");
const envStatus = document.getElementById("envStatus");
const resultCard = document.getElementById("resultCard");
const resultMessage = document.getElementById("resultMessage");
const resultStatus = document.getElementById("resultStatus");
const checksGrid = document.getElementById("checksGrid");
const rawResponse = document.getElementById("rawResponse");

function setToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์สลิปไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

function updateEnvStatus() {
  if (typeof isSupabaseReady !== "undefined" && isSupabaseReady) {
    envStatus.textContent = "พร้อมยิงไป Supabase";
    envStatus.className = "status-chip success";
    return;
  }

  envStatus.textContent = "ยังไม่พร้อม: ต้องตั้ง SUPABASE_URL และ SUPABASE_ANON_KEY ที่หน้าเว็บ";
  envStatus.className = "status-chip error";
}

function renderChecks(checks = {}) {
  const entries = Object.values(checks || {});
  if (!entries.length) {
    checksGrid.innerHTML = "";
    return;
  }

  checksGrid.innerHTML = entries.map(item => {
    const ok = item?.ok === true;
    return `
      <div class="check-box ${ok ? "ok" : "bad"}">
        <strong>${escapeHtml(item?.label || "-")}</strong>
        <div>${ok ? "ผ่าน" : "ไม่ผ่าน"}</div>
        <small>คาดหวัง: ${escapeHtml(String(item?.expected ?? "-"))}</small><br>
        <small>ที่ได้: ${escapeHtml(String(item?.actual ?? "-"))}</small>
      </div>
    `;
  }).join("");
}

function renderResult(ok, payload, fallbackMessage = "") {
  resultCard.classList.remove("hidden");
  resultStatus.className = `status-chip ${ok ? "success" : "error"}`;
  resultStatus.textContent = ok ? "ตรวจผ่าน" : "ตรวจไม่ผ่าน";
  resultMessage.textContent = payload?.data?.message || payload?.message || fallbackMessage || "-";
  renderChecks(payload?.data?.checks || payload?.data?.slipVerifyChecks || {});
  rawResponse.value = JSON.stringify(payload, null, 2);
}

async function fillSettingsFromSystem() {
  try {
    const bootstrap = await apiRequest({ action: "bootstrap" });
    const settings = bootstrap?.data?.settings || {};

    homestaySlugInput.value = getCurrentHomestaySlug();
    bankAccountNameInput.value = settings.bankAccountName?.value || "";
    bankAccountNumberInput.value = settings.bankAccountNumber?.value || "";
    bookingCodeInput.value = `TEST-${Date.now()}`;
    grandTotalInput.value = grandTotalInput.value || "20";

    setToast("ดึงค่าจากระบบแล้ว");
  } catch (error) {
    console.error(error);
    setToast(error?.message || "ดึงค่าจากระบบไม่สำเร็จ");
  }
}

async function runSlipTest(event) {
  event.preventDefault();

  if (!(typeof isSupabaseReady !== "undefined" && isSupabaseReady)) {
    setToast("หน้านี้ต้องใช้ Supabase mode");
    return;
  }

  const file = slipFileInput.files && slipFileInput.files[0];
  if (!file) {
    setToast("กรุณาเลือกรูปสลิป");
    return;
  }

  if (!file.type.startsWith("image/")) {
    setToast("รองรับเฉพาะไฟล์รูปภาพ");
    return;
  }

  runTestBtn.disabled = true;
  runTestBtn.textContent = "กำลังทดสอบ...";

  try {
    const slipBase64 = await fileToBase64(file);
    const payload = {
      action: "precheckSlip",
      slipBase64,
      booking: {
        bookingCode: bookingCodeInput.value.trim(),
        grandTotal: Number(grandTotalInput.value || 0),
        bankAccountName: bankAccountNameInput.value.trim(),
        bankAccountNumber: bankAccountNumberInput.value.trim()
      }
    };

    const result = await apiRequest(payload);
    renderResult(true, result, "ตรวจผ่าน");
    setToast("ทดสอบตรวจสลิปสำเร็จ");
  } catch (error) {
    console.error(error);
    renderResult(false, { ok: false, message: error?.message || "สลิปไม่ถูกต้อง" }, "ตรวจไม่ผ่าน");
    setToast(error?.message || "ทดสอบไม่ผ่าน");
  } finally {
    runTestBtn.disabled = false;
    runTestBtn.textContent = "เริ่มตรวจสลิป";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyBrandAssets(normalizeSettings(typeof localGetSettings === "function" ? localGetSettings() : DEFAULT_SETTINGS));
  homestaySlugInput.value = getCurrentHomestaySlug();
  bookingCodeInput.value = `TEST-${Date.now()}`;
  updateEnvStatus();
  fillSettingsFromSystem();
});

fillSettingsBtn.addEventListener("click", fillSettingsFromSystem);
slipTestForm.addEventListener("submit", runSlipTest);
