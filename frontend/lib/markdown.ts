// Minimal markdown-subset renderer for our own MDX fixture content (content/blog/*.mdx).
// Not a general-purpose parser — handles only the constructs our blog content uses:
// ## headings, 1. numbered lists, - bullet lists, **bold** inline, and paragraphs.
// Content is developer-authored (not user input), so building HTML strings here is safe.

function renderInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.trim().split("\n");
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!.trim();

    if (line === "") {
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      htmlBlocks.push(`<h2>${renderInline(line.slice(3))}</h2>`);
      i++;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!.trim())) {
        items.push(`<li>${renderInline(lines[i]!.trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      htmlBlocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i]!.trim())) {
        items.push(`<li>${renderInline(lines[i]!.trim().replace(/^-\s+/, ""))}</li>`);
        i++;
      }
      htmlBlocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Paragraph: collect until blank line
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== "" && !lines[i]!.trim().startsWith("## ")) {
      paragraphLines.push(lines[i]!.trim());
      i++;
    }
    htmlBlocks.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return htmlBlocks.join("\n");
}
