import { siteData } from "../../../site-data";
import { useWriting } from "../hooks/useWriting";

export function WritingSection() {
  const writingQuery = useWriting();
  const posts = writingQuery.data ?? siteData.writing.fallbackPosts;

  return (
    <section className="writing-section" aria-label="Notes">
      <p className="section-label">{writingQuery.isFetching ? siteData.writing.loadingLabel : siteData.writing.label}</p>
      <div className="note-list">
        {posts.map((post) => (
          <a href={post.url} key={post.title}>
            <span>{post.date}</span>
            <strong>{post.title}</strong>
            <p>{post.summary}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
