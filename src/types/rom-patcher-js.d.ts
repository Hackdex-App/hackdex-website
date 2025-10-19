declare module 'rom-patcher-js/rom-patcher-js/modules/BinFile.js' {
  export interface BinFileInstance {
    fileName: string;
    fileType: string;
    fileSize: number;
    littleEndian: boolean;
    _u8array: Uint8Array;
    seek(offset: number): void;
    skip(nBytes: number): void;
    isEOF(): boolean;
    slice(offset?: number, len?: number, doNotClone?: boolean): BinFileInstance;
    copyTo(target: BinFileInstance, offsetSource: number, len?: number, offsetTarget?: number): void;
    save(): void;
    getExtension(): string;
    getName(): string;
    setExtension(newExtension: string): string;
    setName(newName: string): string;
    readU8(): number;
    readU16(): number;
    readU32(): number;
    readBytes(len: number): number[];
    readString(len: number): string;
    writeU8(u8: number): void;
    writeU16(u16: number): void;
    writeBytes(bytes: number[]): void;
    hashCRC32(start?: number, len?: number): number;
  }

  const BinFile: {
    new (source: ArrayBuffer | ArrayBufferView | File | FileList | HTMLElement | number): BinFileInstance;
    prototype: BinFileInstance;
  };
  export default BinFile;
}

declare module 'rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js' {
  import BinFile from 'rom-patcher-js/rom-patcher-js/modules/BinFile.js';

  export interface BPSInstance {
    sourceSize: number;
    targetSize: number;
    metaData: string;
    sourceChecksum: number;
    targetChecksum: number;
    patchChecksum: number;
    apply(romFile: BinFile, validate?: boolean): BinFile;
    export(fileName?: string): BinFile;
  }
  const BPS: {
    new(): BPSInstance;
    prototype: BPSInstance;
    MAGIC: string;
    fromFile(file: BinFile): BPSInstance;
    buildFromRoms(original: BinFile, modified: BinFile, deltaMode?: boolean): BPSInstance;
  };
  export default BPS;
}

