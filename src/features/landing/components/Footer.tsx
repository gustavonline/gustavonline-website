import { siteData } from "../../../site-data";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>{siteData.footer.copyright}</p>
      <SocialLinks variant="footer" />
    </footer>
  );
}
