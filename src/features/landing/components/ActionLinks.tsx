import { siteData } from "../../../site-data";

export function ActionLinks() {
  return (
    <section className="link-section" aria-label="More from Gustav">
      {siteData.links.actions.map((link) => (
        <div className="action-row" key={link.href}>
          <span className="action-description">{link.description}</span>
          <a className="action-line" href={link.href}>
            {link.label}
          </a>
        </div>
      ))}
    </section>
  );
}
