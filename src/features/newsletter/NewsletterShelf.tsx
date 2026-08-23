import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { WritingPost } from "../../../shared/contracts/content";
import type { Theme } from "../landing/types";
import {
  BriefingShelfEngine,
  type ShelfMode,
} from "./shelf/BriefingShelfEngine";
import type { ShelfBriefBook } from "./shelf/types";

const palettes = [
  { cover: "#d86f35", accent: "#fff4df", ink: "#2e2924", titleColor: "#fffaf1" },
  { cover: "#747b55", accent: "#f1c58e", ink: "#20231b", titleColor: "#fffaf1" },
  { cover: "#e7d6bd", accent: "#dc7138", ink: "#312b26", titleColor: "#312b26" },
  { cover: "#4a4742", accent: "#ef9258", ink: "#171614", titleColor: "#fffaf1" },
  { cover: "#b7ad99", accent: "#68704e", ink: "#2c2925", titleColor: "#27231f" },
];

function toShelfBooks(posts: WritingPost[]): ShelfBriefBook[] {
  if (posts.length === 0) {
    return [{
      id: "empty-archive-bookend",
      date: "",
      title: "Archive starts here",
      shortTitle: "Archive starts here",
      tagline: "No issues yet. This is a bookend, not a published edition.",
      coverPlaneWidth: 1.62,
      thickness: 0.19,
      height: 1.82,
      cover: "#e4d6c2",
      accent: "#d86f35",
      ink: "#34302b",
      titleColor: "#34302b",
      placeholder: true,
    }];
  }

  return posts.map((post, index) => {
    const palette = palettes[index % palettes.length];
    return {
      id: `${post.url}-${index}`,
      date: post.date,
      title: post.title,
      shortTitle: post.title,
      tagline: post.summary,
      coverPlaneWidth: 1.62 + ((index % 5) - 2) * 0.02,
      thickness: 0.27 + (index % 4) * 0.018,
      height: 1.78 + (index % 3) * 0.02,
      cover: palette.cover,
      accent: palette.accent,
      ink: palette.ink,
      titleColor: palette.titleColor,
      spotlight: index === 0,
    };
  });
}

export function NewsletterShelf({ posts, theme }: { posts: WritingPost[]; theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BriefingShelfEngine | null>(null);
  const books = useMemo(() => toShelfBooks(posts), [posts]);
  const structureKey = useMemo(() => books.map((book) => book.id).join("|"), [books]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<ShelfMode>("browse");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    setActiveIndex(0);
    setSelectedIndex(null);
    setMode("browse");

    const engine = new BriefingShelfEngine(
      canvas,
      books,
      {
        onActiveIndex: setActiveIndex,
        onMode: (nextMode, nextSelectedIndex) => {
          setMode(nextMode);
          setSelectedIndex(nextSelectedIndex);
        },
        onReady: () => setReady(true),
      },
      { initialIndex: 0, spotlightIndex: posts.length > 0 ? 0 : null, theme },
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [structureKey]);

  useEffect(() => {
    engineRef.current?.updateBooks(books);
  }, [books]);

  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  const isReading = mode !== "browse";
  const selectedPost = selectedIndex === null ? null : posts[selectedIndex] ?? null;
  const hasPosts = posts.length > 0;
  const counter = hasPosts
    ? `${Math.min(activeIndex + 1, posts.length)} / ${posts.length}`
    : "0 issues";

  function closeBook() {
    engineRef.current?.returnToShelf();
    window.setTimeout(() => canvasRef.current?.focus(), 0);
  }

  return (
    <section className="bookshelf-section" aria-labelledby="bookshelf-title">
      <div className={`bookshelf-stage ${ready ? "is-ready" : ""} ${isReading ? "is-reading" : ""}`}>
        <h2 className="sr-only" id="bookshelf-title">Newsletter bookshelf</h2>
        <canvas
          ref={canvasRef}
          className="bookshelf-canvas"
          tabIndex={0}
          aria-label={hasPosts
            ? `Newsletter bookshelf with ${posts.length} published ${posts.length === 1 ? "issue" : "issues"}. Use drag, scroll, or arrow keys to browse; press Enter to open.`
            : "Empty newsletter bookshelf. No issues are published yet."}
        />

        {!ready && <p className="bookshelf-loading" role="status">Preparing the shelf…</p>}

        <button
          className="shelf-arrow shelf-arrow-previous"
          type="button"
          aria-label="Previous newsletter issue"
          disabled={!hasPosts || activeIndex <= 0 || isReading}
          onClick={() => engineRef.current?.browseBy(-1)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          className="shelf-arrow shelf-arrow-next"
          type="button"
          aria-label="Next newsletter issue"
          disabled={!hasPosts || activeIndex >= posts.length - 1 || isReading}
          onClick={() => engineRef.current?.browseBy(1)}
        >
          <ChevronRight aria-hidden="true" />
        </button>

        {isReading && (
          <article className="shelf-reader" aria-live="polite">
            <button type="button" onClick={closeBook} aria-label="Close newsletter issue">
              <X aria-hidden="true" />
            </button>
            {selectedPost ? (
              <>
                <p className="pixel-label">PUBLISHED NOTE · {selectedPost.date}</p>
                <h3>{selectedPost.title}</h3>
                <p>{selectedPost.summary}</p>
                <a href={selectedPost.url}>Open the full note <span aria-hidden="true">↗</span></a>
              </>
            ) : (
              <>
                <p className="pixel-label">ARCHIVE BOOKEND</p>
                <h3>No issues yet.</h3>
                <p>The shelf is ready for the first real newsletter. This object is not a published edition.</p>
              </>
            )}
          </article>
        )}
      </div>

      <div className="bookshelf-controls">
        <p>drag <span>·</span> scroll <span>·</span> arrow keys</p>
        <output aria-live="polite">{counter}</output>
      </div>
      {!hasPosts && (
        <p className="shelf-empty-copy" role="status">
          <strong>Archive starts here.</strong> No issues have been published yet.
        </p>
      )}
    </section>
  );
}
