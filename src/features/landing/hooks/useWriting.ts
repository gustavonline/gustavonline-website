import { useQuery } from "@tanstack/react-query";

import { fetchWriting } from "../../../services/content";

export function useWriting(newslettersOnly = false) {
  return useQuery({
    queryKey: ["writing", newslettersOnly ? "newsletter" : "all"],
    queryFn: () => fetchWriting(newslettersOnly),
  });
}
