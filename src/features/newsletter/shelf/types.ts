export type ShelfBriefBook = {
  id: string;
  date: string;
  title: string;
  shortTitle: string;
  tagline?: string;
  tools?: string[];
  agents?: Array<{
    id: string;
    portrait?: HTMLImageElement | null;
    brandLogo?: HTMLImageElement | null;
  }>;
  motif?: string;
  edition?: string;
  coverPlaneWidth: number;
  coverImage?: string | null;
  thickness: number;
  height: number;
  cover: string;
  accent: string;
  ink: string;
  titleColor?: string;
  spotlight?: boolean;
  placeholder?: boolean;
};
