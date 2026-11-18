import { Mail, Music2 } from "lucide-react";
import { ArrowIcon } from "../../../family/ArrowIcon";
import { FamilyMark } from "../../../family/FamilyMark";
import { siteData } from "../../../site-data";
import { brandForLabel } from "./brandMarks";

export function ActionLinks() {
  return (
    <section className="link-section" aria-labelledby="destinations-title">
      <h2 id="destinations-title">Projects &amp; newsletter</h2>
      <ul className="destination-grid" role="list">
        {siteData.links.actions.map((link) => {
          const external = /^https?:\/\//.test(link.href);
          const brand = brandForLabel(link.label);
          const Icon = link.href === "/newsletter" ? Mail : Music2;
          return (
            <li key={link.href}>
              <a
                className="destination-link"
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                data-brand={brand}
              >
                <span className="destination-icon" aria-hidden="true">
                  {brand === "onlinesourdough" || brand === "arcitai"
                    ? <FamilyMark brand={brand} />
                    : <Icon size={20} strokeWidth={1.65} />}
                </span>
                <span className="destination-copy">
                  <span className="destination-name brand-name-token" data-brand-name={brand}>{link.label}</span>
                  <span className="destination-description">{link.description}</span>
                </span>
                <span className="destination-arrow" aria-hidden="true">
                  <ArrowIcon direction={external ? "up-right" : "right"} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
