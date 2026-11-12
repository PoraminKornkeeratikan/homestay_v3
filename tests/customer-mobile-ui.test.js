const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const customerHtml = fs.readFileSync(path.join(root, "customer.html"), "utf8");
const customerJs = fs.readFileSync(path.join(root, "customer.js"), "utf8");
const ownerJs = fs.readFileSync(path.join(root, "owner.js"), "utf8");

test("booking success popup has a close control and close behavior", () => {
  assert.match(customerHtml, /id="closeBookingSuccessBtn"/);
  assert.match(customerJs, /function closeBookingSuccess\(\)/);
  assert.match(customerJs, /closeBookingSuccessBtn\?\.addEventListener\("click", closeBookingSuccess\)/);
});

test("mobile form dismisses the keyboard when tapping outside an editable field", () => {
  assert.match(customerJs, /document\.addEventListener\("pointerdown", dismissKeyboardOutsideField, true\)/);
  assert.match(customerJs, /activeElement\.blur\(\)/);
  assert.match(customerJs, /visualViewport\.addEventListener\("resize", updateKeyboardState\)/);
});

test("owner booking rows do not render automatic slip verification status", () => {
  const renderBookingTable = customerSection(ownerJs, "function renderBookingTable()", "async function updateStatus");
  assert.doesNotMatch(renderBookingTable, /renderSlipVerifyStatus/);
  assert.doesNotMatch(renderBookingTable, /slipVerifyHtml/);
});

function customerSection(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1);
  assert.notEqual(endIndex, -1);
  return source.slice(startIndex, endIndex);
}
