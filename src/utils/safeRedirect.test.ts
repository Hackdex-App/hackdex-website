import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalRedirect } from "./safeRedirect.ts";

test("keeps ordinary local destinations", () => {
  for (const path of ["/dashboard", "/account?from=login", "/hack/example#details"]) {
    assert.equal(safeInternalRedirect(path, "/fallback"), path);
  }
});

test("falls back for external or malformed destinations", () => {
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5Cevil.example",
    "/dashboard\\evil.example",
    "/dashboard\n/next",
    "dashboard",
    "",
    null,
  ]) {
    assert.equal(safeInternalRedirect(path, "/fallback"), "/fallback", String(path));
  }
});
