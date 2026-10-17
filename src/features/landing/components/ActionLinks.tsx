import { siteData } from "../../../site-data";

export function ActionLinks() {
  return (
    <section className="link-section" aria-label="Projects and newsletter">
      {siteData.links.actions.map((link) => {
        const external = /^https?:\/\//.test(link.href);
        return (
          <a
            className="action-row"
            key={link.href}
            href={link.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            <span className="action-line">{link.label} <span aria-hidden="true">↗</span></span>
            <span className="action-description">{link.description}</span>
          </a>
        );
      })}
    </section>
  );
}
