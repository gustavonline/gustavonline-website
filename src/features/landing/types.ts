import type { siteData } from "../../site-data";

export type Theme = "light" | "dark";
export type PageMetadata = "home" | "newsletter";

export type FloatingCard = (typeof siteData.floatingCards)[number];

export type FloatingCardView = FloatingCard & {
  motion: {
    rotation: string;
    scale: string;
    x: string;
    y: string;
  };
};
