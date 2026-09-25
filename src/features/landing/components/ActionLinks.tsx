import { siteData } from "../../../site-data";

export function ActionLinks() {
  return (
    <section className="link-section" aria-label="Projects and newsletter">
      {siteData.links.actions.map((link) => (
        <a className="action-row" key={link.href} href={link.href}>
          <span className="action-line">{link.label} <span aria-hidden="true">↗</span></span>
          <span className="action-description">{link.description}</span>
        </a>
      ))}
    </section>
  );
}
