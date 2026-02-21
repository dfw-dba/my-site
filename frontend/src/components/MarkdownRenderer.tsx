interface MarkdownRendererProps {
  content: string;
}

function convertMarkdown(md: string): string {
  let html = md;

  // Escape HTML entities (but preserve our own tags added below)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks: ```lang\n...\n```
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto text-sm my-4"><code>${code.trim()}</code></pre>`,
  );

  // Inline code: `code`
  html = html.replace(
    /`([^`\n]+)`/g,
    '<code class="bg-gray-100 text-pink-600 rounded px-1.5 py-0.5 text-sm">$1</code>',
  );

  // Headings: # through ######
  html = html.replace(
    /^######\s+(.+)$/gm,
    '<h6 class="text-sm font-semibold mt-6 mb-2">$1</h6>',
  );
  html = html.replace(
    /^#####\s+(.+)$/gm,
    '<h5 class="text-base font-semibold mt-6 mb-2">$1</h5>',
  );
  html = html.replace(
    /^####\s+(.+)$/gm,
    '<h4 class="text-lg font-semibold mt-6 mb-2">$1</h4>',
  );
  html = html.replace(
    /^###\s+(.+)$/gm,
    '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>',
  );
  html = html.replace(
    /^##\s+(.+)$/gm,
    '<h2 class="text-2xl font-bold mt-8 mb-3">$1</h2>',
  );
  html = html.replace(
    /^#\s+(.+)$/gm,
    '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>',
  );

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Horizontal rule: --- or ***
  html = html.replace(
    /^(---|\*\*\*)$/gm,
    '<hr class="my-6 border-gray-300" />',
  );

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Unordered lists: convert blocks of "- item" lines
  html = html.replace(
    /(?:^- .+\n?)+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => `<li class="ml-4">${line.replace(/^- /, "")}</li>`)
        .join("\n");
      return `<ul class="list-disc list-inside my-4 space-y-1">\n${items}\n</ul>`;
    },
  );

  // Ordered lists: convert blocks of "1. item" lines
  html = html.replace(
    /(?:^\d+\. .+\n?)+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map(
          (line) =>
            `<li class="ml-4">${line.replace(/^\d+\.\s/, "")}</li>`,
        )
        .join("\n");
      return `<ol class="list-decimal list-inside my-4 space-y-1">\n${items}\n</ol>`;
    },
  );

  // Blockquotes: > text
  html = html.replace(
    /^&gt;\s+(.+)$/gm,
    '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">$1</blockquote>',
  );

  // Paragraphs: wrap remaining text blocks separated by double newlines
  // Split on double newlines, wrap plain text in <p> tags
  const blocks = html.split(/\n\n+/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Don't wrap block-level elements
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<hr")
      ) {
        return trimmed;
      }
      return `<p class="my-3 leading-relaxed">${trimmed}</p>`;
    })
    .join("\n\n");

  return html;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = convertMarkdown(content);

  return (
    <div
      className="text-gray-800 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
