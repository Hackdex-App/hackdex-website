import assert from "node:assert/strict";
import test from "node:test";
import { parseHackRedirect } from "./hackRedirect.ts";

const site = "https://hackdex.app";

test("blank means no redirect", () => {
  assert.deepEqual(parseHackRedirect("   ", "old", site), { ok: true, url: null });
});

test("accepts site paths and http(s) links, trimmed", () => {
  assert.deepEqual(parseHackRedirect(" /hack/new ", "old", site), { ok: true, url: "/hack/new" });
  assert.deepEqual(parseHackRedirect("https://example.com/x", "old", site), { ok: true, url: "https://example.com/x" });
});

test("rejects other schemes and protocol-relative links", () => {
  for (const input of ["javascript:alert(1)", "example.com", "//evil.com", "/\\evil.com", "ftp://x.com"]) {
    assert.equal(parseHackRedirect(input, "old", site).ok, false, input);
  }
});

test("rejects the hack's own page, however it's written", () => {
  for (const input of ["/hack/old", "/hack/old/", "/HACK/Old?x=1", "https://hackdex.app/hack/old", "/hack/old/session", "/hack/old/versions"]) {
    assert.equal(parseHackRedirect(input, "old", site).ok, false, input);
  }
  // Same path on another site, or a hack whose slug only starts the same, is fine.
  assert.equal(parseHackRedirect("/hack/older", "old", site).ok, true);
  assert.equal(parseHackRedirect("https://example.com/hack/old", "old", site).ok, true);
});
