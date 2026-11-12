const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ownerHtml = fs.readFileSync(path.join(__dirname, "..", "owner.html"), "utf8");

test("owner header overrides the shared mobile static header rule", () => {
  const rule = ownerHtml.match(/body:not\(\.login-hidden\)\s*>\s*header\.topbar\s*\{([^}]*)\}/);

  assert.ok(rule, "missing owner-specific topbar rule");
  assert.match(rule[1], /position:\s*sticky/);
  assert.match(rule[1], /top:\s*0/);
  assert.match(rule[1], /z-index:\s*200/);
});

test("owner header remains hidden before login", () => {
  assert.match(ownerHtml, /body\.login-hidden\s+header\.topbar\s*\{\s*display:\s*none;/);
});
