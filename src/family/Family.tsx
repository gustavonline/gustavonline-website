import { useState, type FormEvent, type ReactNode } from "react";
import { BrandIcon } from "./BrandIcon";
import { FamilyMark } from "./FamilyMark";
import { familyHref, localReview, type FamilyBrand } from "./preview";

import { newsletterReceipt, submitNewsletter } from "./newsletter";

const labels = { gustavonline: "gustavonline", onlinesourdough: "onlinesourdough", arcitai: "Arc’IT AI" };
const social = [
  ["YouTube", "https://www.youtube.com/@gustavonline", "youtube"],
  ["Instagram", "https://www.instagram.com/gustavonline/", "instagram"],
  ["LinkedIn", "https://www.linkedin.com/in/gustavonline/", "linkedin"],
  ["GitHub", "https://github.com/gustavonline", "github"],
];

export function FamilyFooter({ brand }: { brand: FamilyBrand }) {
  return (
    <div className="family-footer">
      <nav className="family-sites" aria-label="Other sites by Gustav">
        {(Object.keys(labels) as FamilyBrand[])
          .filter((key) => key !== brand)
          .map((key) => (
            <a key={key} href={familyHref(key)}>
              <span className="family-site-mark"><FamilyMark brand={key} /></span>
              {labels[key]} <span aria-hidden="true">↗</span>
            </a>
          ))}
      </nav>
      <div className="family-footer-details">
        <nav className="family-social" aria-label="Social profiles">
          {social.map(([label, href, icon]) => (
            <a key={label} href={href} aria-label={label} title={label}>
              <BrandIcon name={icon} />
            </a>
          ))}
        </nav>
        <p className="family-footer-meta">
          {brand === "gustavonline" ? "VAT: DK46128435" : (
            <>Part of <a href={familyHref("gustavonline")}>Gustav Online</a></>
          )}
        </p>
      </div>
    </div>
  );
}

export function NewsletterContent({ brand, children }: { brand: FamilyBrand; children?: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const thanks = window.location.pathname.replace(/\/$/, "").endsWith("/thank-you");
  const subscribed = thanks && newsletterReceipt();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const email = String(new FormData(event.currentTarget).get("email") ?? "");
      await submitNewsletter(email, brand);
      window.location.assign("/newsletter/thank-you/");
    } catch {
      setError("The signup could not be completed. Your email is still here — please try again.");
      setPending(false);
    }
  };
  if (thanks) return <section className="family-newsletter family-thanks">
    <h1>{subscribed ? "You’re on the list" : "Notes from the work"}</h1>
    <p>{subscribed ? "You’ll hear from Gustav when the next note is ready." : "Sign up to receive the next note from Gustav."}</p>
    <a className="family-button" href={subscribed ? "/" : "/newsletter"}>
      {subscribed ? (brand === "onlinesourdough" ? "Explore the menu" : `Back to ${labels[brand]}`) : "Subscribe"} <span aria-hidden="true">↗</span>
    </a>
    {localReview && <p className="review-notice">Local preview — no email has been subscribed.</p>}
  </section>;
  return <>
    <section className="family-newsletter" aria-labelledby="newsletter-title">
      <h1 id="newsletter-title">Notes from<br />the work</h1>
      <p className="newsletter-byline">A newsletter by Gustav Anderson.</p>
      <p>Experiments, workflows and lessons from using AI in a real business.</p>
      <form className="family-signup" onSubmit={submit} aria-busy={pending}>
        <label htmlFor="newsletter-email">Email address</label>
        <div className="family-form-row">
          <input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required aria-describedby="newsletter-consent newsletter-status" />
          <button className="family-button" disabled={pending} type="submit">{pending ? "Subscribing…" : "Subscribe"}</button>
        </div>
        <p id="newsletter-consent">One newsletter from gustavonline. Unsubscribe anytime.</p>
        <p id="newsletter-status" role="status">{error}</p>
        {localReview && <p className="review-notice">Local preview — this form does not send your email.</p>}
      </form>
    </section>
    {children}
  </>;
}
