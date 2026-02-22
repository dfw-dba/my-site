import { renderWithProviders } from "../setup";
import MarkdownRenderer from "../../src/components/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders headings, bold, italic", () => {
    const { container } = renderWithProviders(
      <MarkdownRenderer content={"# Heading\n\n**bold** and *italic*"} />
    );

    expect(container.querySelector("h1")).toHaveTextContent("Heading");
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
  });

  it("renders code blocks and inline code", () => {
    const content = "Here is `inline code` and:\n\n```js\nconst x = 1;\n```";
    const { container } = renderWithProviders(
      <MarkdownRenderer content={content} />
    );

    const preElement = container.querySelector("pre");
    expect(preElement).toBeInTheDocument();

    const codeElements = container.querySelectorAll("code");
    expect(codeElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders lists and blockquotes", () => {
    const content = "- item1\n- item2\n\n> quote text";
    const { container } = renderWithProviders(
      <MarkdownRenderer content={content} />
    );

    const listItems = container.querySelectorAll("li");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent("item1");
    expect(listItems[1]).toHaveTextContent("item2");

    const blockquote = container.querySelector("blockquote");
    expect(blockquote).toHaveTextContent("quote text");
  });

  it("escapes HTML entities", () => {
    const { container } = renderWithProviders(
      <MarkdownRenderer content={"<script>alert('xss')</script>"} />
    );

    // The script tag should be escaped, not rendered as an actual script element
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).toContain("&lt;script&gt;");
  });
});
