import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import { createOutputSink, SaveCancelledError } from "@/utils/patching/save";
import { decodeXdelta, friendlyXdeltaError } from "@/utils/patching/xdelta";

export type PatchFormat = "bps" | "xdelta";

export function patchFormatFromFilename(filename: string | null | undefined): PatchFormat {
  if (filename && filename.toLowerCase().endsWith(".xdelta")) {
    return "xdelta";
  }
  return "bps";
}

export async function applyPatch(opts: {
  format: PatchFormat;
  baseFile: File;
  patchBlob: Blob;
  outputName: string;
  sourceName?: string;
  onProgress?: (p: { bytesOut: number }) => void;
}): Promise<void> {
  const { format, baseFile, patchBlob, outputName, sourceName, onProgress } = opts;

  if (format === "bps") {
    const [romBuf, patchBuf] = await Promise.all([
      baseFile.arrayBuffer(),
      patchBlob.arrayBuffer(),
    ]);

    const romBin = new BinFile(romBuf);
    romBin.fileName = sourceName ?? baseFile.name;
    const patchBin = new BinFile(patchBuf);

    const patch = BPS.fromFile(patchBin);
    const patchedRom = patch.apply(romBin);
    patchedRom.fileName = outputName;
    patchedRom.save();
    return;
  }

  // format === "xdelta"
  const sink = await createOutputSink(outputName);
  try {
    const result = await decodeXdelta({
      sourceFile: baseFile,
      patchBlob,
      onChunk: (bytes) => sink.write(bytes),
      onProgress: onProgress
        ? (p) => {
            onProgress({ bytesOut: p.bytesOut });
          }
        : undefined,
    });

    if (!result.ok) {
      await sink.abort();
      throw new Error(friendlyXdeltaError(result));
    }

    await sink.close();
  } catch (error) {
    if (error instanceof SaveCancelledError) {
      throw error;
    }
    try {
      await sink.abort();
    } catch {
      // ignore abort failures after a prior error
    }
    throw error;
  }
}
