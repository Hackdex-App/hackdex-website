import assert from "node:assert/strict";
import test from "node:test";
import { matchesHackName } from "./hackNameSearch.ts";

const crest = { title: "Emerald Crest", author: "@mossfern" };

test("matches part of the title once the query has 5 characters", () => {
  assert.equal(matchesHackName("emera", crest), true);
  assert.equal(matchesHackName("ld cr", crest), true);
});

test("ignores part of the title under 5 characters", () => {
  assert.equal(matchesHackName("emer", crest), false);
  assert.equal(matchesHackName("rest", crest), false);
});

test("matches the exact title at any length", () => {
  assert.equal(matchesHackName("gaia", { title: "Gaia", author: "@someone" }), true);
});

test("matches the exact author with or without the @", () => {
  assert.equal(matchesHackName("mossfern", crest), true);
  assert.equal(matchesHackName("@mossfern", crest), true);
  assert.equal(matchesHackName("@ax", { title: "Emerald Crest", author: "@ax" }), true);
});

test("ignores part of the author", () => {
  assert.equal(matchesHackName("mossf", crest), false);
  assert.equal(matchesHackName("@moss", crest), false);
});

test("ignores case and surrounding spaces", () => {
  assert.equal(matchesHackName("  EMERALD crest ", crest), true);
  assert.equal(matchesHackName(" @MossFern", crest), true);
});

test("an empty or blank query matches nothing", () => {
  assert.equal(matchesHackName("", crest), false);
  assert.equal(matchesHackName("   ", crest), false);
  assert.equal(matchesHackName("@", { title: "Emerald Crest", author: "" }), false);
});
