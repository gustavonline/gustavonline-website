import { NewsletterContent } from "../../../family/Family";
import { NewsletterShelf } from "../../newsletter/NewsletterShelf";
import { useWriting } from "../hooks/useWriting";
import { SiteLayout } from "./SiteLayout";
export function NewsletterPage() {
  const writingQuery = useWriting();
  return <SiteLayout page="newsletter" mainClassName="newsletter-main">
    {(theme) => <NewsletterContent brand="gustavonline">
      <div className="family-bookshelf">
        <h2>The bookshelf</h2>
        {writingQuery.isPending ? <p role="status">Loading the archive…</p> :
          writingQuery.isError ? <p role="status">The archive could not be reached. Please try again later.</p> :
          <NewsletterShelf posts={writingQuery.data ?? []} theme={theme} />}
      </div>
    </NewsletterContent>}
  </SiteLayout>;
}
