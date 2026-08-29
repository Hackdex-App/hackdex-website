import { revalidatePath, revalidateTag } from "next/cache";

export function revalidateDiscoverCatalog() {
  revalidateTag("discover");
  revalidatePath("/discover");
  revalidatePath("/");
}
