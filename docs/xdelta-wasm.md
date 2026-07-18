# Building and vendoring xdelta WASM

Hackdex patches xdelta (VCDIFF) files in the browser using a WebAssembly build of [xdelta3](https://github.com/jmacd/xdelta). That binary is **not** built inside this repo. You build it from a local checkout of the Hackdex fork of [xdelta-wasm](https://github.com/Hackdex-App/xdelta-wasm) (forked from [kotcrab/xdelta-wasm](https://github.com/kotcrab/xdelta-wasm)), then copy two artifacts into `public/xdelta/`.

Use this guide when you need to rebuild or update those artifacts.

---

## Prerequisites

- A local checkout of [Hackdex-App/xdelta-wasm](https://github.com/Hackdex-App/xdelta-wasm).
- [Emscripten](https://emscripten.org) (`emcc` 6.x tested). On macOS: `brew install emscripten`. Otherwise follow the [emsdk install docs](https://emscripten.org/docs/getting_started/downloads.html).
- After cloning xdelta-wasm, initialize the jmacd/xdelta submodule:

```bash
git submodule update --init
```

This populates `native/xdelta`.

---

## One-time setup (XZ / liblzma)

Secondary LZMA compression (`xdelta3 -S lzma`) needs static liblzma. Run this if `native/xz/` is missing:

```bash
./native/build-xz.sh
```

That downloads XZ Utils and builds it with `emconfigure` / `emmake`.

---

## Building

From the xdelta-wasm checkout root:

```bash
./native/build.sh
```

This compiles `native/xdelta/xdelta3/xdelta3.c` and `native/xdelta3-wasm.c`, links liblzma, and writes:

- `public/xdelta3.js` (ES6 module)
- `public/xdelta3.wasm` (Companion WASM binary)

---

## Vendoring into Hackdex

Copy **only** those two files into this repo (overwrite existing):

```bash
cp public/xdelta3.js public/xdelta3.wasm \
  /path/to/hackdex-website/public/xdelta/
```

Do **not** overwrite these Hackdex-owned files in `public/xdelta/`:

- `xdelta3.worker.js`: Hackdex worker (protocol differs from upstream)
- `LICENSE-xdelta3.txt`
- `NOTICE.txt`

---

## Licensing

See `public/xdelta/LICENSE-xdelta3.txt` and `public/xdelta/NOTICE.txt`.