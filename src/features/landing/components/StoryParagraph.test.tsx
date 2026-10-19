import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StoryParagraph } from "./StoryParagraph";

describe("README story attribution", () => {
  it("renders the source author credit as a real external link", () => {
    const html = renderToStaticMarkup(<StoryParagraph text="Built on paper-rs by [Michael Shimeles](https://github.com/michaelshimeles)." />);
    expect(html).toBe('<p>Built on paper-rs by <a href="https://github.com/michaelshimeles" target="_blank" rel="noopener noreferrer">Michael Shimeles</a>.</p>');
  });

  it("preserves ordinary text and multiple credits in order", () => {
    const html = renderToStaticMarkup(<StoryParagraph text="A [person](https://github.com/person) and a [project](https://github.com/person/project)." />);
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain('>person</a> and a <a ');
    expect(html).toContain('>project</a>.</p>');
    expect(renderToStaticMarkup(<StoryParagraph text="A simple paragraph." />)).toBe('<p>A simple paragraph.</p>');
  });

  it("does not turn HTML, unsafe URLs or images into executable content", () => {
    for (const text of ['[author](javascript:alert(1))', '[author](https://github.com.evil.test/person)', '[author](https://github.com@evil.test/person)', '[author](//github.com/person)', '![image](https://github.com/person)', '<img src=x onerror=alert(1)>']) {
      const html = renderToStaticMarkup(<StoryParagraph text={text} />);
      expect(html).not.toContain('<a ');
      expect(html).not.toContain('<img');
    }
  });
});
