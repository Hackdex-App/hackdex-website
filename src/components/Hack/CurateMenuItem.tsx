"use client";

import { MenuItem } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa6";
import { toast } from "sonner";

import { setHackCurated } from "@/app/hack/actions";

interface CurateMenuItemProps {
  slug: string;
  curated: boolean;
}

/** Admin menu item that adds a hack to, or removes it from, Discover and the homepage. */
export default function CurateMenuItem({ slug, curated }: CurateMenuItemProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const StarIcon = curated ? FaStar : FaRegStar;

  const handleToggle = async () => {
    if (isPending) return;

    setIsPending(true);
    try {
      const result = await setHackCurated(slug, !curated);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // The menu closes on click, so the star's pop plays in the toast.
      if (curated) {
        toast.success("Un-curated. It no longer appears on Discover or the homepage.", { icon: <FaRegStar size={14} /> });
      } else {
        toast.success("Curated. It now appears on Discover and the homepage.", { icon: <FaStar className="anim-pop text-accent-text" size={14} /> });
      }
      router.refresh();
    } catch {
      toast.error("Failed to update this hack's curation.");
    } finally {
      setIsPending(false);
    }
  };

  const label = curated ? "Un-curate" : "Curate";
  const pendingLabel = curated ? "Un-curating…" : "Curating…";

  return (
    <MenuItem
      as="button"
      type="button"
      disabled={isPending}
      onClick={handleToggle}
      className="block w-full px-3 py-2 text-left text-sm font-medium text-text-2 data-focus:bg-surface-2 disabled:opacity-50"
    >
      <StarIcon className="mb-0.5 mr-2 inline-block align-middle" size={12} />
      {isPending ? pendingLabel : label}
    </MenuItem>
  );
}
