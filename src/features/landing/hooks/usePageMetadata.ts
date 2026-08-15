import { useEffect } from "react";

import { siteData } from "../../../site-data";
import type { PageMetadata } from "../types";

export function usePageMetadata(page: PageMetadata) {
  useEffect(() => {
    const isNewsletter = page === "newsletter";
    const title = isNewsletter ? siteData.seo.newsletterTitle : siteData.seo.homeTitle;
    const description = isNewsletter
      ? siteData.seo.newsletterDescription
      : siteData.seo.description;
    const canonicalUrl = new URL(window.location.href);
    canonicalUrl.search = "";
    canonicalUrl.hash = "";

    document.title = title;
    setMetaContent("description", description);
    setMetaProperty("og:title", isNewsletter ? title : siteData.seo.ogTitle);
    setMetaProperty("og:description", description);
    setMetaProperty("og:image", new URL(siteData.seo.ogImage, window.location.href).toString());
    setMetaProperty("og:type", "website");
    setMetaProperty("og:url", canonicalUrl.toString());
    setCanonical(canonicalUrl.toString());
  }, [page]);
}

function setMetaContent(name: string, content: string) {
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.setAttribute("content", content);
}

function setMetaProperty(property: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonical(href: string) {
  let element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}
