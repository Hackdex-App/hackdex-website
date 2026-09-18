import RomsInteractive from "@/components/Roms/RomsInteractive";
import BaseRomReadyCount from "@/components/Roms/BaseRomReadyCount";

export default function RomsPage() {
  return (
    <div className="mx-auto w-full max-w-[1164px] px-6 pb-6 pt-4 md:pt-6">
      <h1 className="font-display flex items-center gap-3 text-[28px] leading-tight md:text-[32px]">My ROMs <BaseRomReadyCount /></h1>
      <p className="mt-2 max-w-[70ch] text-[15px] text-text-2">
        Link your legally-obtained base ROM files from your device so the patcher can auto-detect them. Files never leave your
        device.
      </p>
      <RomsInteractive />
    </div>
  );
}


