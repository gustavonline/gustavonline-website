import { useMediaQuery } from "./useMediaQuery";

type SaveDataNavigator = Navigator & { connection?: { saveData?: boolean } };

/** The visitor's data-saving preference (media query or the Save-Data connection hint), read only. */
export function useSaveData() {
  const reducedData = useMediaQuery("(prefers-reduced-data: reduce)");
  const saveData = typeof navigator !== "undefined" && (navigator as SaveDataNavigator).connection?.saveData === true;
  return reducedData || saveData;
}
