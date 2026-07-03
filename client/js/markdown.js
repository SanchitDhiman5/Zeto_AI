export class MarkdownParser {
  static parse(text) {
    if (!text) return "";

    let html = text
      // Escape HTML entities to prevent XSS
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")

      // Code Blocks (```lang code ```)
      .replace(/```([\s\S]*?)```/g, (match, code) => {
        const lines = code.trim().split("\n");
        const lang = lines[0].trim();
        const codeContent = lines.length > 1 ? lines.slice(1).join("\n") : code;
        return `
                    <div class="relative group mt-4 mb-4">
                        <div class="absolute top-0 right-0 bg-gray-800 text-xs px-2 py-1 rounded-bl-md text-gray-400 border-l border-b border-gray-700 flex items-center gap-2">
                            <span>${lang}</span>
                            <button class="copy-code-btn hover:text-white transition-colors" data-code="${encodeURIComponent(codeContent)}" aria-label="Copy code">
                                <i class="fa-regular fa-clipboard"></i>
                            </button>
                        </div>
                        <pre><code class="language-${lang}">${codeContent}</code></pre>
                    </div>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Blockquotes
      .replace(
        /^> (.*$)/gim,
        '<blockquote class="border-l-4 border-accent pl-4 italic text-gray-400 my-2">$1</blockquote>',
      )
      // Headers
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>',
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-2xl font-bold mt-5 mb-3">$1</h2>',
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>',
      )
      // Unordered Lists
      .replace(
        /^\s*[-*+] (.*$)/gim,
        '<ul class="list-disc ml-6 mb-2"><li>$1</li></ul>',
      )
      // Fix adjacent list items
      .replace(/<\/ul>\n<ul class="list-disc ml-6 mb-2">/g, "\n")
      // Paragraphs (newlines)
      .replace(/\n$/gim, "<br />");

    return `<div class="markdown-body">${html}</div>`;
  }
}
