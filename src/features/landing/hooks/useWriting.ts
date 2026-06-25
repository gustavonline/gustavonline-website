import { useQuery } from "@tanstack/react-query";

import { fetchWriting } from "../../../services/content";
import { siteData } from "../../../site-data";

export function useWriting() {
  return useQuery({
    queryKey: ["writing"],
    queryFn: fetchWriting,
    placeholderData: siteData.writing.fallbackPosts,
  });
}
