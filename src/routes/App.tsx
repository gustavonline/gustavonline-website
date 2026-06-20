import { useQuery } from "@tanstack/react-query";
import { Moon, Send, Sun } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";

import { siteData } from "../site-data";
import { fetchWriting, submitNewsletterSignup } from "../services/content";

type FloatingCard = (typeof siteData.floatingCards)[number];
type FloatingCardView = FloatingCard & {
  motion: {
    rotation: string;
    scale: string;
    x: string;
    y: string;
  };
};

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return localStorage.getItem(siteData.themeStorageKey) === "dark" ? "dark" : "light";
  });
  const [floatingCards] = useState(() => createFloatingCards(siteData.floatingCards));
  const [selectedCard, setSelectedCard] = useState<FloatingCard | null>(null);
  const writingQuery = useQuery({
    queryKey: ["writing"],
    queryFn: fetchWriting,
    placeholderData: siteData.writing.fallbackPosts,
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(siteData.themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    document.title = siteData.seo.title;
    setMetaContent("description", siteData.seo.description);
    setMetaProperty("og:title", siteData.seo.ogTitle);
    setMetaProperty("og:description", siteData.seo.description);
    setMetaProperty("og:image", siteData.seo.ogImage);
  }, []);

  return (
    <div className="page-shell">
      <Header theme={theme} onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")} />
      <FloatingCards cards={floatingCards} onSelect={setSelectedCard} />
      <main className="main-panel">
        <section className="profile-section" aria-label="Profile">
          <div className="name-row">
            <h1>{siteData.name}</h1>
            <img src={siteData.portrait} alt={siteData.name} />
          </div>

          <p className="intro-copy">{siteData.profile.intro}</p>

          <div className="content-note">
            <p>{siteData.profile.noteLine}</p>
            <SocialLinks />
          </div>

          <NewsletterForm />
        </section>

        <section className="link-section" aria-label="Actions">
          {siteData.links.actions.map((link) => (
            <a className="action-line" href={link.href} key={link.title}>
              <span>{link.title}</span>
              <strong>{link.label}</strong>
            </a>
          ))}
        </section>

        <section className="writing-section" aria-label="Notes">
          <p className="section-label">{writingQuery.isFetching ? siteData.writing.loadingLabel : siteData.writing.label}</p>
          <div className="note-list">
            {(writingQuery.data ?? siteData.writing.fallbackPosts).map((post) => (
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
      {selectedCard && <ImageModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}

const floatingCardSlots = ["slot-a", "slot-b", "slot-c", "slot-d", "slot-e", "slot-f"] as const;

function FloatingCards({
  cards,
  onSelect,
}: {
  cards: FloatingCardView[];
  onSelect: (card: FloatingCard) => void;
}) {
  return (
    <div className="floating-card-layer" aria-label="Portfolio image cards">
      {cards.map((card, index) => (
        <button
          className={`floating-card floating-card-${floatingCardSlots[index % floatingCardSlots.length]} floating-card-kind-${card.variant}`}
          key={card.src}
          onClick={() => onSelect(card)}
          style={{
            "--float-rotate": card.motion.rotation,
            "--float-scale": card.motion.scale,
            "--float-x": card.motion.x,
            "--float-y": card.motion.y,
          } as CSSProperties}
          type="button"
        >
          <img src={card.src} alt={card.alt} />
        </button>
      ))}
    </div>
  );
}

function createFloatingCards(cards: typeof siteData.floatingCards): FloatingCardView[] {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]];
  }

  return shuffled.map((card) => ({
    ...card,
    motion: {
      rotation: `${randomBetween(-3, 3)}deg`,
      scale: randomBetween(0.92, 1.08).toFixed(2),
      x: `${randomBetween(-16, 16)}px`,
      y: `${randomBetween(-58, 58)}px`,
    },
  }));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function ImageModal({
  card,
  onClose,
}: {
  card: FloatingCard;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="image-modal" role="dialog" aria-modal="true" aria-label={card.alt}>
      <button className="image-modal-backdrop" type="button" onClick={onClose} aria-label="Close image preview" />
      <figure className="image-modal-panel">
        <button className="image-modal-close" type="button" onClick={onClose} aria-label="Close image preview">
          ×
        </button>
        <img src={card.src} alt={card.alt} />
        <figcaption>{card.alt}</figcaption>
      </figure>
    </div>
  );
}

function Header({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  const homeHref = window.location.pathname.startsWith("/gustavonline") ? "/gustavonline/" : "/";

  return (
    <header className="site-header">
      <a className="logo-link" href={homeHref} aria-label={`${siteData.brand} home`}>
        <img src={siteData.logo} alt="" />
      </a>
      <a className="brand-link" href={homeHref} aria-label={`${siteData.brand} home`}>
        {siteData.navBrand}
      </a>
      <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label="Toggle light and dark mode">
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </header>
  );
}

function SocialLinks({ variant = "top" }: { variant?: "top" | "footer" }) {
  const links = variant === "footer" ? siteData.links.footerSocial : siteData.links.social;

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
      <p>
        {status === "idle" && siteData.newsletter.idle}
        {status === "loading" && siteData.newsletter.loading}
        {status === "success" && siteData.newsletter.success}
        {status === "error" && siteData.newsletter.error}
      </p>
    </form>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <p>{siteData.footer.copyright}</p>
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
