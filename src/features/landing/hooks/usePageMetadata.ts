import { useEffect } from "react";

import { siteData } from "../../../site-data";

export function usePageMetadata() {
  useEffect(() => {
    document.title = siteData.seo.title;
    setMetaContent("description", siteData.seo.description);
    setMetaProperty("og:title", siteData.seo.ogTitle);
    setMetaProperty("og:description", siteData.seo.description);
    setMetaProperty("og:image", siteData.seo.ogImage);
  }, []);
}

function setMetaContent(name: string, content: string) {
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.setAttribute("content", content);
}

function setMetaProperty(property: string, content: string) {
  document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.setAttribute("content", content);
}
