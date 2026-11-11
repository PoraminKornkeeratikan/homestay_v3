const assert = require("node:assert/strict");
const test = require("node:test");

function normalizeBookingDateKey(value) {
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function bookingCoversDate(booking, dateKey) {
  const selectedDate = normalizeBookingDateKey(dateKey);
  const checkInDate = normalizeBookingDateKey(booking.checkIn);
  const checkOutDate = normalizeBookingDateKey(booking.checkOut);

  if (!selectedDate || !checkInDate || !checkOutDate) return false;
  return selectedDate >= checkInDate && selectedDate < checkOutDate;
}

test("one-night stay occupies check-in day but not checkout day", () => {
  const booking = { checkIn: "2026-11-10", checkOut: "2026-11-11" };

  assert.equal(bookingCoversDate(booking, "2026-11-10"), true);
  assert.equal(bookingCoversDate(booking, "2026-11-11"), false);
});

test("checkout day can be used as the next booking's check-in day", () => {
  const first = { checkIn: "2026-11-10", checkOut: "2026-11-11" };
  const next = { checkIn: "2026-11-11", checkOut: "2026-11-12" };

  assert.equal(bookingCoversDate(first, "2026-11-11"), false);
  assert.equal(bookingCoversDate(next, "2026-11-11"), true);
});

test("date-time values from an API still treat checkout as exclusive", () => {
  const booking = {
    checkIn: "2026-11-10T00:00:00+07:00",
    checkOut: "2026-11-11T00:00:00+07:00"
  };

  assert.equal(bookingCoversDate(booking, "2026-11-10"), true);
  assert.equal(bookingCoversDate(booking, "2026-11-11"), false);
});
