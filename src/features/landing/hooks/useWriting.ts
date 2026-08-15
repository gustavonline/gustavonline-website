import { useQuery } from "@tanstack/react-query";

import { fetchWriting } from "../../../services/content";

export function useWriting() {
  return useQuery({
    queryKey: ["writing"],
    queryFn: fetchWriting,
  });
}
