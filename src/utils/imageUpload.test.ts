import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { reencodeAvatarImage, reencodeCoverImage } from "./imageUpload.ts";

test("rejects an SVG even when a caller labels it as a screenshot", async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"/>');
  assert.equal(await reencodeCoverImage(svg), null);
  assert.equal(await reencodeAvatarImage(svg), null);
});

test("rewrites valid PNG pixels without keeping appended content", async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer();
  const result = await reencodeCoverImage(Buffer.concat([png, Buffer.from("UNTRUSTED_TRAILER")]));
  assert.ok(result);
  assert.equal(result.extension, "png");
  assert.equal(result.contentType, "image/png");
  assert.equal(result.bytes.includes("UNTRUSTED_TRAILER"), false);
  assert.deepEqual((await sharp(result.bytes).metadata()).format, "png");
});

test("JPEG and GIF screenshots remain supported", async () => {
  for (const format of ["jpeg", "gif"] as const) {
    const input = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } })[format]().toBuffer();
    const result = await reencodeCoverImage(input);
    assert.ok(result);
    assert.equal((await sharp(result.bytes).metadata()).format, format);
  }
});

test("avatars are cropped to a small PNG with no original trailing content", async () => {
  const jpeg = await sharp({ create: { width: 400, height: 300, channels: 3, background: "white" } }).jpeg().toBuffer();
  const output = await reencodeAvatarImage(Buffer.concat([jpeg, Buffer.from("UNTRUSTED_TRAILER")]));
  assert.ok(output);
  assert.equal(output.includes("UNTRUSTED_TRAILER"), false);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 240);
  assert.equal(metadata.height, 240);
});
