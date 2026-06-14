import { useQuery } from "@tanstack/react-query";
import { Moon, Send, Sun } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { actionLinks, footerSocialLinks, site, socialLinks, staticWriting } from "../site-data";
import { fetchWriting, submitNewsletterSignup } from "../services/content";

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return localStorage.getItem(site.themeStorageKey) === "dark" ? "dark" : "light";
  });
  const writingQuery = useQuery({
    queryKey: ["writing"],
    queryFn: fetchWriting,
    placeholderData: staticWriting,
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(site.themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    document.title = site.seo.title;
    setMetaContent("description", site.seo.description);
    setMetaProperty("og:title", site.seo.ogTitle);
    setMetaProperty("og:description", site.seo.description);
    setMetaProperty("og:image", site.seo.ogImage);
  }, []);

  return (
    <div className="page-shell">
      <Header theme={theme} onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")} />
      <main className="main-panel">
        <section className="profile-section" aria-label="Profile">
          <div className="name-row">
            <h1>{site.name}</h1>
            <img src={site.portrait} alt={site.name} />
          </div>

          <p className="intro-copy">{site.profile.intro}</p>

          <div className="content-note">
            <p>{site.profile.noteLine}</p>
            <SocialLinks />
          </div>

          <NewsletterForm />
        </section>

        <section className="link-section" aria-label="Actions">
          <div className="golden-orbit" aria-hidden="true" />
          {actionLinks.map((link) => (
            <a className="action-line" href={link.href} key={link.title}>
              <span>{link.title}</span>
              <strong>{link.label}</strong>
            </a>
          ))}
        </section>

        <section className="writing-section" aria-label="Notes">
          <p className="section-label">{writingQuery.isFetching ? site.writing.loadingLabel : site.writing.label}</p>
          <div className="note-list">
            {(writingQuery.data ?? staticWriting).map((post) => (
              <a href={post.url} key={post.title}>
                <span>{post.date}</span>
                <strong>{post.title}</strong>
                <p>{post.summary}</p>
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Header({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  return (
    <header className="site-header">
      <a href="/" aria-label={`${site.brand} home`}>
        <img src={site.logo} alt="" />
        <span>{site.brand}</span>
      </a>
      <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label="Toggle light and dark mode">
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </header>
  );
}

function SocialLinks({ variant = "top" }: { variant?: "top" | "footer" }) {
  const links = variant === "footer" ? footerSocialLinks : socialLinks;

  return (
    <div className="social-links" aria-label="Social links">
      {links.map((link) => (
        <a href={link.href} key={link.label} aria-label={link.label} title={link.label}>
          <BrandIcon name={link.icon} />
        </a>
      ))}
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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
    <form className="newsletter-form" onSubmit={onSubmit}>
      <label htmlFor="email">{site.newsletter.label}</label>
      <div>
        <input
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={site.newsletter.placeholder}
          required
          type="email"
          value={email}
        />
        <button disabled={status === "loading"} type="submit" aria-label="Subscribe">
          <Send size={16} />
        </button>
      </div>
      <p>
        {status === "idle" && site.newsletter.idle}
        {status === "loading" && site.newsletter.loading}
        {status === "success" && site.newsletter.success}
        {status === "error" && site.newsletter.error}
      </p>
    </form>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <p>{site.footer.copyright}</p>
      <SocialLinks variant="footer" />
    </footer>
  );
}

function setMetaContent(name: string, content: string) {
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.setAttribute("content", content);
}

function setMetaProperty(property: string, content: string) {
  document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.setAttribute("content", content);
}

function BrandIcon({ name }: { name: string }) {
  if (name === "github") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.45 11.45 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.63-5.49 5.93.43.37.82 1.1.82 2.23v3.3c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
      </svg>
    );
  }

  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.61 0 4.27 2.38 4.27 5.47v6.27ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
      </svg>
    );
  }

  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7.25A4.75 4.75 0 1 1 12 16.75 4.75 4.75 0 0 1 12 7.25Zm0 2A2.75 2.75 0 1 0 12 14.75 2.75 2.75 0 0 0 12 9.25Zm5.05-2.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.9 3.1h3.7l-8 9.1 9.4 8.7h-7.4l-5.8-5.4-6.6 5.4H.5l8.6-9.6L0 3.1h7.6l5.2 4.8 6.1-4.8Zm-1.3 16.3h2L6.5 4.5H4.4l13.2 14.9Z" />
    </svg>
  );
}
