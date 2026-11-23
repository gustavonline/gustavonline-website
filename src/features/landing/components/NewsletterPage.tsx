import { NewsletterContent } from "../../../family/Family";
import { NewsletterShelf } from "../../newsletter/NewsletterShelf";
import { useWriting } from "../hooks/useWriting";
import { SiteLayout } from "./SiteLayout";
export function NewsletterPage() {
  const writingQuery = useWriting(true);
  return <SiteLayout page="newsletter" mainClassName="newsletter-main">
    {() => <NewsletterContent brand="gustavonline">
      {(subscribed) => <div className="family-bookshelf" id="bookshelf">
        {subscribed && <p className="newsletter-confirmation" role="status">You’re on the list. You’ll hear from Gustav when the next note is ready.</p>}
        <h2>The Bookshelf</h2>
        {writingQuery.isPending ? <p role="status">Loading the archive…</p> :
          writingQuery.isError ? <p role="status">The archive could not be reached. Please try again later.</p> :
          <NewsletterShelf posts={writingQuery.data ?? []} />}
      </div>}
    </NewsletterContent>}
  </SiteLayout>;
}
