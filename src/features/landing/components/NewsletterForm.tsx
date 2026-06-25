import { Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { submitNewsletterSignup } from "../../../services/content";
import { siteData } from "../../../site-data";

type SubmitStatus = "idle" | "loading" | "success" | "error";

export function NewsletterForm() {
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
    <form className="newsletter-form" id="newsletter" onSubmit={onSubmit}>
      <label htmlFor="email">{siteData.newsletter.label}</label>
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
        <button disabled={status === "loading"} type="submit" aria-label="Subscribe">
          <Send size={16} />
        </button>
      </div>
      <p>{getStatusMessage(status)}</p>
    </form>
  );
}

function getStatusMessage(status: SubmitStatus) {
  if (status === "loading") return siteData.newsletter.loading;
  if (status === "success") return siteData.newsletter.success;
  if (status === "error") return siteData.newsletter.error;
  return siteData.newsletter.idle;
}
