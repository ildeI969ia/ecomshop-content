import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li",
      "b", "i", "strong", "em", "strike", "code", "hr", "br", "div",
      "table", "thead", "caption", "tbody", "tr", "th", "td", "pre", "span", "img",
      "figure", "figcaption"
    ],
    ALLOWED_ATTR: [
      "href", "name", "target", "src", "alt", "title", "class", "style", "id",
      "data-image-id", "data-placement-after"
    ]
  });
}
