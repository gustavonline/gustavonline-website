import { siteData } from "../../../site-data";
import { BrandIcon } from "./BrandIcon";

export function SocialLinks({ variant = "top" }: { variant?: "top" | "footer" }) {
  const links = variant === "footer" ? siteData.links.footerSocial : siteData.links.social;

  return (
    <nav className="social-links" aria-label="Social profiles">
      {links.map((link) => (
        <a href={link.href} key={link.label} aria-label={link.label} title={link.label}>
          <BrandIcon name={link.icon} />
        </a>
      ))}
    </nav>
  );
}
