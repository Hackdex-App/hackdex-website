"use client";

import { MenuItem } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaDiscord } from "react-icons/fa6";
import { toast } from "sonner";

import { createHackReviewThread } from "@/app/hack/actions";

interface CreateReviewThreadMenuItemProps {
  slug: string;
}

export default function CreateReviewThreadMenuItem({
  slug,
}: CreateReviewThreadMenuItemProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleCreate = async () => {
    if (isPending) return;

    setIsPending(true);
    try {
      const result = await createHackReviewThread(slug);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.alreadyExists
          ? "A Discord review thread already exists."
          : "Discord review thread created.",
      );
      router.refresh();
    } catch {
      toast.error("Failed to create the Discord review thread.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <MenuItem
      as="button"
      type="button"
      disabled={isPending}
      onClick={handleCreate}
      className="block w-full px-3 py-2 text-left text-sm text-foreground/80 font-medium data-focus:bg-black/5 dark:data-focus:bg-white/10 disabled:opacity-50"
    >
      <FaDiscord
        className="mr-2 inline-block align-middle mb-0.5 text-foreground/80"
        size={12}
      />
      {isPending ? "Creating review thread…" : "Create review thread"}
    </MenuItem>
  );
}
