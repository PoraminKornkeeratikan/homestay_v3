/*
  ใส่ Web app URL ของ Google Apps Script ตรงนี้
  ตัวอย่าง:
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/xxxxx/exec";
*/

const GOOGLE_SCRIPT_URL = "";

const ADMIN_PASSWORD = "1234";

const DEFAULT_ROOMS = [
  {
    id: "standard",
    name: "ห้อง Standard",
    price: 690,
    detail: "ห้องเรียบง่าย สะอาด เหมาะสำหรับ 1-2 คน",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=70",
    active: true
  },
  {
    id: "deluxe",
    name: "ห้อง Deluxe",
    price: 990,
    detail: "พื้นที่กว้างขึ้น มีมุมนั่งเล่น บรรยากาศอบอุ่น",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=70",
    active: true
  },
  {
    id: "family",
    name: "ห้อง Family",
    price: 1490,
    detail: "เหมาะสำหรับครอบครัว พักได้หลายคน สะดวกสบาย",
    image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=70",
    active: true
  }
];

const DEFAULT_SETTINGS = {
  siteName: { label: "ชื่อเว็บไซต์", value: "Wintery House" },
  logoUrl: { label: "โลโก้", value: "LOGO.jpg" },
  mookata: { label: "หมูกระทะ", price: 450 },
  extraBed: { label: "เตียงเสริม", price: 300 },
  bankName: { label: "ธนาคาร", value: "ธ.กสิกรไทย" },
  bankAccountName: { label: "ชื่อบัญชี", value: "GreenStay Homestay" },
  bankAccountNumber: { label: "เลขบัญชี", value: "123-4-56789-0" },
  promptPayId: { label: "เลขพร้อมเพย์สำหรับ QR", value: "" },
  pageUrl: { label: "ลิงก์เพจ", value: "" },
  gpsUrl: { label: "ลิงก์ GPS", value: "" },
  qrCodeUrl: { label: "QR-code ชำระเงิน", value: "" },
  paymentNote: { label: "หมายเหตุชำระเงิน", value: "โอนแล้วส่งสลิปให้แอดมินเพื่อยืนยันการจอง" },
  propertyPolicy: {
    label: "นโยบายที่พัก",
    value: "1. เช็กอินได้ตั้งแต่ 14:00 น.\n2. เช็กเอาต์ก่อน 12:00 น.\n3. กรุณางดส่งเสียงดังหลัง 22:00 น.\n4. หากมีของเสียหาย ผู้เข้าพักต้องรับผิดชอบตามจริง\n5. ต้องแสดงเลขรายการจองหรือรูปหลักฐานการจองตอนเข้าพัก"
  }
};

const BOOKING_FEE = 20;

// ======= CREDIT SYSTEM =======
const CREDIT_PER_BOOKING = 20;   // เครดิตที่ใช้ต่อการจอง 1 ครั้ง
const COMPANY_PASSWORD = "1234"; // รหัสผ่านหน้า company

const TOPUP_PAYMENT_SETTINGS = {
  bankName: { label: "ช่องทางรับเงิน", value: "พร้อมเพย์" },
  bankAccountName: { label: "ชื่อบัญชี", value: "ปรมินทร์ กรกีรติการ" },
  bankAccountNumber: { label: "เลขพร้อมเพย์", value: "0938160831" },
  promptPayId: { label: "เลขพร้อมเพย์สำหรับ QR", value: "0938160831" }
};

const CREDIT_PACKAGES = [
  { credits: 1000, price: 1000,  label: "🥉 เริ่มต้น",  unitCost: "50 ห้อง" },
  { credits: 2000, price: 2000,  label: "🥈 ธรรมดา",    unitCost: "100 ห้อง" },
  { credits: 4000, price: 4000,  label: "🥇 โปร",      unitCost: "200 ห้อง" },
  { credits: 0,    price: 20000, label: "📅 รายปี",    unitCost: "฿1,666/เดือน", type: "yearly" },
];

// helpers เครดิต (ใช้ localStorage key: hs_credits, hs_plan, hs_plan_start, hs_plan_type)
function getCredits() {
  return parseInt(localStorage.getItem("hs_credits") || "0");
}
function setCredits(n) {
  localStorage.setItem("hs_credits", Math.max(0, n));
}
function getPlanType() {
  return localStorage.getItem("hs_plan_type") || ""; // "credit"|"yearly"|"infinity"
}
function getPlanStart() {
  return localStorage.getItem("hs_plan_start") || "";
}
function setPlan(type, startDate) {
  localStorage.setItem("hs_plan_type", type);
  if (startDate) localStorage.setItem("hs_plan_start", startDate);
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
