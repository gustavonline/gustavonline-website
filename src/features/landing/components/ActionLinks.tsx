import { siteData } from "../../../site-data";

export function ActionLinks() {
  return (
    <section className="link-section" aria-label="Actions">
      {siteData.links.actions.map((link) => (
        <a className="action-line" href={link.href} key={link.title}>
          <span>{link.title}</span>
          <strong>{link.label}</strong>
        </a>
      ))}
    </section>
  );
}
