import { Link } from "@tanstack/react-router";

import { siteData } from "../../../site-data";
import { NewsletterShelf } from "../../newsletter/NewsletterShelf";
import { useWriting } from "../hooks/useWriting";
import type { Theme } from "../types";
import { NewsletterForm } from "./NewsletterForm";
import { SiteLayout } from "./SiteLayout";

export function NewsletterPage() {
  const writingQuery = useWriting();
  const posts = writingQuery.data ?? [];

  return (
    <SiteLayout page="newsletter" mainClassName="newsletter-main">
      {(theme: Theme) => (
        <>
          <section className="archive-intro" aria-labelledby="archive-title">
            <p className="pixel-label"><span aria-hidden="true">●</span> GUSTAV ONLINE / NOTES</p>
            <h1 id="archive-title">Newsletter archive</h1>
            <p>{siteData.newsletter.support}</p>
            <Link to="/">Back home <span aria-hidden="true">↗</span></Link>
          </section>

          <div className="archive-signup">
            <NewsletterForm showSupport={false} />
          </div>

          {writingQuery.isPending ? (
            <div className="archive-query-state" role="status">Loading the archive…</div>
          ) : writingQuery.isError ? (
            <div className="archive-query-state" role="status">
              <strong>The archive could not be reached.</strong>
              <p>Please try again later. No local entries are shown as published.</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="archive-query-state archive-empty-state" role="status">
              <strong>Archive starts here.</strong>
              <p>No issues have been published yet.</p>
            </div>
          ) : (
            <NewsletterShelf posts={posts} theme={theme} />
          )}
        </>
      )}
    </SiteLayout>
  );
}
