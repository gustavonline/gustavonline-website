import type { FormEvent } from "react";
import { useState } from "react";

import { submitNewsletterSignup } from "../../../services/content";
import { siteData } from "../../../site-data";

type SubmitStatus = "idle" | "loading" | "success" | "error";

export function NewsletterForm({ showSupport = true }: { showSupport?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    try {
      await submitNewsletterSignup(email);
      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="newsletter-form" id="newsletter" onSubmit={onSubmit} aria-labelledby="newsletter-heading">
      <h2 className="newsletter-heading" id="newsletter-heading">{siteData.newsletter.label}</h2>
      {showSupport && <p className="newsletter-support">{siteData.newsletter.support}</p>}
      <label className="sr-only" htmlFor="email">Email address</label>
      <div>
        <input
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={siteData.newsletter.placeholder}
          required
          type="email"
          value={email}
        />
        <button disabled={status === "loading"} type="submit">
          {siteData.newsletter.submitLabel}
        </button>
      </div>
      <p className="newsletter-status" aria-live="polite">{getStatusMessage(status)}</p>
    </form>
  );
}

function getStatusMessage(status: SubmitStatus) {
  if (status === "loading") return siteData.newsletter.loading;
  if (status === "success") return siteData.newsletter.success;
  if (status === "error") return siteData.newsletter.error;
  return "";
}
