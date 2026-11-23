import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { WritingPost } from "../../../shared/contracts/content";
import { ArrowIcon } from "../../family/ArrowIcon";
import "./newsletter-shelf.css";

export function NewsletterShelf({ posts }: { posts: WritingPost[] }) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [detailUrl, setDetailUrl] = useState<string | null>(null);
  const activeIndex = Math.max(0, posts.findIndex((post) => post.url === activeUrl));
  const activePost = posts[activeIndex];
  const detailPost = posts.find((post) => post.url === detailUrl);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const opener = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const shelf = useRef<HTMLElement>(null);
  const titleId = useId();
  const detailId = useId();

  function hideCursor() {
    if (cursor.current) cursor.current.dataset.visible = "false";
    if (shelf.current) shelf.current.dataset.cursorActive = "false";
  }

  useEffect(hideCursor, [activePost?.url, detailUrl]);
  useEffect(() => {
    window.addEventListener("scroll", hideCursor, { passive: true, capture: true });
    window.addEventListener("blur", hideCursor);
    document.addEventListener("visibilitychange", hideCursor);
    return () => {
      window.removeEventListener("scroll", hideCursor, true);
      window.removeEventListener("blur", hideCursor);
      document.removeEventListener("visibilitychange", hideCursor);
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!detailPost || !element) {
      if (element?.open) element.close();
      return;
    }
    const previousOverflow = document.documentElement.style.overflow;
    element.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      if (element.open) element.close();
    };
  }, [detailPost?.url]);

  function select(index: number, focus = false) {
    const post = posts[index];
    if (!post) return;
    hideCursor();
    setActiveUrl(post.url);
    if (focus) buttons.current[index]?.focus({ preventScroll: true });
  }

  function onBookKey(event: KeyboardEvent<HTMLButtonElement>) {
    const next = event.key === "ArrowLeft" ? activeIndex - 1
      : event.key === "ArrowRight" ? activeIndex + 1
      : event.key === "Home" ? 0 : event.key === "End" ? posts.length - 1 : null;
    if (next !== null) {
      event.preventDefault();
      select(next, true);
    }
  }

  function open(post: WritingPost, source: HTMLButtonElement) {
    hideCursor();
    opener.current = source;
    setDetailUrl(post.url);
  }

  function moveCursor(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || !cursor.current) return;
    cursor.current.style.left = `${event.clientX}px`;
    cursor.current.style.top = `${event.clientY}px`;
    cursor.current.dataset.visible = "true";
    if (shelf.current) shelf.current.dataset.cursorActive = "true";
  }

  return <section className="newsletter-shelf" ref={shelf} data-cursor-active="false" aria-labelledby={titleId}>
    <h3 className="sr-only" id={titleId}>Newsletter shelf</h3>
    {activePost ? <>
      <div className="newsletter-shelf-window">
        <ol className="newsletter-shelf-row" aria-label="Published newsletters">
          {posts.map((post, index) => {
            const selected = index === activeIndex;
            const distance = index - activeIndex;
            const offset = distance <= 0 ? `calc(${distance} * (var(--volume-depth) + var(--volume-gap)))`
              : `calc(var(--volume-open-width) + var(--volume-gap) + ${distance - 1} * (var(--volume-depth) + var(--volume-gap)))`;
            const number = String(index + 1).padStart(2, "0");
            return <li key={post.url} className={`newsletter-volume-slot${selected ? " is-selected" : ""}${index === 0 ? " is-latest" : ""}`}
              style={{ "--volume-offset": offset } as CSSProperties}>
              <button className="newsletter-volume-button" ref={(element) => { buttons.current[index] = element; }}
                type="button" tabIndex={selected ? 0 : -1} aria-pressed={selected}
                aria-label={`Open newsletter ${number}: ${post.title}`}
                aria-haspopup="dialog" onKeyDown={onBookKey}
                onClick={(event) => { select(index); open(post, event.currentTarget); }}
                onPointerMove={selected ? moveCursor : undefined} onPointerEnter={selected ? moveCursor : undefined}
                onPointerLeave={hideCursor}>
                <span className="newsletter-volume-solid" aria-hidden="true">
                  <span className="newsletter-volume-spine">
                    <span className="newsletter-volume-number">{number}</span>
                    <span className="newsletter-volume-spine-title">{post.title}</span>
                    <span className="newsletter-volume-spine-date">{post.date.slice(0, 10)}</span>
                  </span>
                  <span className="newsletter-volume-cover">
                    <span className="newsletter-volume-cover-top"><span>Notes from the work</span><span>{number}</span></span>
                    <span className="newsletter-volume-cover-title">{post.title}</span>
                    <span className="newsletter-volume-cover-rule" />
                    <span className="newsletter-volume-cover-bottom"><span>Gustav Anderson</span><span>{post.date.slice(0, 10)}</span></span>
                  </span>
                </span>
              </button>
            </li>;
          })}
        </ol>
      </div>
      <div className="newsletter-shelf-caption" aria-live="polite">
        <p>{activePost.title}</p><time dateTime={activePost.date}>{activePost.date.slice(0, 10)}</time>
      </div>
    </> : <div className="newsletter-shelf-empty">
      <div className="newsletter-empty-volume" aria-hidden="true"><span>Notes from the work</span><strong>Archive<br />starts here.</strong><span>Gustav Anderson</span></div>
      <p role="status"><strong>Archive starts here.</strong><span>No newsletters published yet. The first note will appear here.</span></p>
    </div>}
    <div className="newsletter-shelf-controls">
      <p>{activePost ? "Select a spine. Open a note." : "The next chapter is on its way."}</p>
      <div className="newsletter-shelf-navigation" role="group" aria-label="Browse newsletters">
        <button type="button" aria-label="Previous newsletter" disabled={!activePost || activeIndex === 0} onClick={() => select(activeIndex - 1)}><ChevronLeft aria-hidden="true" /></button>
        {activePost && <button className="newsletter-shelf-open" type="button" onClick={(event) => open(activePost, event.currentTarget)}>Open newsletter</button>}
        <button type="button" aria-label="Next newsletter" disabled={!activePost || activeIndex >= posts.length - 1} onClick={() => select(activeIndex + 1)}><ChevronRight aria-hidden="true" /></button>
      </div>
      <output aria-live="polite">{activePost ? `${activeIndex + 1} / ${posts.length}` : "0 newsletters"}</output>
    </div>
    <span className="newsletter-open-cursor" ref={cursor} aria-hidden="true" data-visible="false">Open</span>
    <dialog className="newsletter-issue-dialog" ref={dialog} aria-labelledby={detailId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = event.currentTarget.querySelectorAll<HTMLElement>("button, a[href]");
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClose={() => {
        setDetailUrl(null);
        if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
        else buttons.current[activeIndex]?.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) event.currentTarget.close();
      }}>
      <button className="newsletter-issue-close" type="button" autoFocus aria-label="Close newsletter" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>
      {detailPost && <article>
        <p className="newsletter-issue-byline">Notes from the work · <time dateTime={detailPost.date}>{detailPost.date.slice(0, 10)}</time></p>
        <h2 id={detailId}>{detailPost.title}</h2>
        <p className="newsletter-issue-summary">{detailPost.summary}</p>
        <a className="newsletter-issue-link" href={detailPost.url}>Open the full note <ArrowIcon /></a>
      </article>}
    </dialog>
  </section>;
}
