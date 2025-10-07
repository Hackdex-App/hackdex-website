import RomsInteractive from "@/components/Roms/RomsInteractive";
import BaseRomReadyCount from "@/components/Roms/BaseRomReadyCount";

export default function RomsPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Your Base ROMs <BaseRomReadyCount /></h1>
      <p className="mt-2 text-[15px] text-foreground/80">
        Link your legally-obtained base ROM files from your device so the patcher can auto-detect them. Files never leave your
        device.
      </p>
      <RomsInteractive />
    </div>
  );
}


