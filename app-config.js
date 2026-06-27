/*
  ใส่ Web app URL ของ Google Apps Script ตรงนี้
  ตัวอย่าง:
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/xxxxx/exec";
*/

const GOOGLE_SCRIPT_URL = "";

const SUPABASE_URL = "https://hjhkbfxizvcqtisgcmwj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGtiZnhpenZjcXRpc2djbXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTA0NzEsImV4cCI6MjA5Nzg2NjQ3MX0.ylI0DTOPRUTlf404H094c--_AIArNXOW0inp6SobzSc";
const DEFAULT_HOMESTAY_SLUG = "Wiwahrin";

const OWNER_PASSWORD = "1234";

const DEFAULT_ROOMS = [];

const BOOKING_FEE = 20;
const CREDIT_PER_BOOKING = 40;

const DEFAULT_SETTINGS = {
  siteName: { label: "ชื่อเว็บไซต์", value: "" },
  logoUrl: { label: "โลโก้", value: "" },
  mookata: { label: "หมูกระทะ", price: 0 },
  extraBed: { label: "เตียงเสริม", price: 0 },
  addons: {
    label: "บริการเสริม",
    items: []
  },
  bankName: { label: "ธนาคาร", value: "" },
  bankAccountName: { label: "ชื่อบัญชี", value: "" },
  bankAccountNumber: { label: "เลขบัญชี", value: "" },
  promptPayId: { label: "เลขพร้อมเพย์สำหรับ QR", value: "" },
  pageUrl: { label: "ลิงก์เพจ", value: "" },
  gpsUrl: { label: "ลิงก์ GPS", value: "" },
  qrCodeUrl: { label: "QR-code ชำระเงิน", value: "" },
  bookingFee: { label: "ค่าจอง", value: BOOKING_FEE },
  creditPerBooking: { label: "เครดิตที่ใช้ต่อการจอง", value: CREDIT_PER_BOOKING },
  paymentNote: { label: "หมายเหตุชำระเงิน", value: "โอนแล้วส่งสลิปให้แอดมินเพื่อยืนยันการจอง" },
  heroContent: {
    label: "Hero content",
    textPill: "จองง่าย • เลือกบริการเสริม • ชำระผ่านบัญชี",
    textTitle: "จองห้องพัก พร้อมหมูกระทะและเตียงเสริม",
    textBody: "เลือกห้อง วันที่เข้าพัก เพิ่มบริการเสริม แล้วโอนชำระผ่านบัญชีธนาคารของโฮมสเตย์",
    textImage: "",
    cardEyebrow: "บรรยากาศพักผ่อน",
    cardTitle: "Green",
    cardSubtitle: "Minimal Homestay",
    cardImage: ""
  },
  propertyPolicy: {
    label: "นโยบายที่พัก",
    value: "1. เช็กอินได้ตั้งแต่ 14:00 น.\n2. เช็กเอาต์ก่อน 12:00 น.\n3. กรุณางดส่งเสียงดังหลัง 22:00 น.\n4. หากมีของเสียหาย ผู้เข้าพักต้องรับผิดชอบตามจริง\n5. ต้องแสดงเลขรายการจองหรือรูปหลักฐานการจองตอนเข้าพัก"
  }
};

// ======= CREDIT SYSTEM =======
const ADMIN_PASSWORD = "1234"; // รหัสผ่านหน้า admin

const TOPUP_PAYMENT_SETTINGS = {
  bankName: { label: "ช่องทางรับเงิน", value: "พร้อมเพย์" },
  bankAccountName: { label: "ชื่อบัญชี", value: "ปรมินทร์ กรกีรติการ" },
  bankAccountNumber: { label: "เลขพร้อมเพย์", value: "0938160831" },
  promptPayId: { label: "เลขพร้อมเพย์สำหรับ QR", value: "0938160831" }
};

const CREDIT_PACKAGES = [
  { credits: 800, price: 400,  label: "🧪 ทดลอง", unitCost: "20 ห้อง" },
  { credits: 2000, price: 1000,  label: "🥉 เริ่มต้น", unitCost: "50 ห้อง" },
  { credits: 4000, price: 2000,  label: "🥈 ธรรมดา", unitCost: "100 ห้อง" },
  { credits: 8000, price: 4000,  label: "🥇 โปร", unitCost: "200 ห้อง" },
  { credits: 20000, price: 10000,  label: "👑 โปรแม็ก", unitCost: "500 ห้อง" },
  { credits: 40000, price: 20000,  label: "🕐 ใช้ยาวๆ", unitCost: "1000 ห้อง" },
];

// helpers เครดิต (ใช้ localStorage key: hs_credits, hs_plan, hs_plan_start, hs_plan_type)
function getCredits() {
  return parseInt(localStorage.getItem("hs_credits") || "0");
}
function setCredits(n) {
  localStorage.setItem("hs_credits", Math.max(0, n));
}
function resetLocalPlanState() {
  setCredits(0);
  setPlan("credit", "");
}
function getPlanType() {
  return localStorage.getItem("hs_plan_type") || ""; // "credit"|"yearly"|"infinity"
}
function getPlanStart() {
  return localStorage.getItem("hs_plan_start") || "";
}
function setPlan(type, startDate) {
  localStorage.setItem("hs_plan_type", type);
  if (startDate) {
    localStorage.setItem("hs_plan_start", startDate);
  } else {
    localStorage.removeItem("hs_plan_start");
  }
}
function isSystemActive() {
  const type = getPlanType();
  if (type === "infinity") return true;
  if (type === "yearly") {
    const start = getPlanStart();
    if (!start) return false;
    const exp = new Date(start);
    exp.setFullYear(exp.getFullYear() + 1);
    return new Date() < exp;
  }
  // credit plan
  return getCredits() > 0;
}
function getExpiryDate() {
  const start = getPlanStart();
  if (!start) return null;
  const exp = new Date(start);
  exp.setFullYear(exp.getFullYear() + 1);
  return exp;
}
