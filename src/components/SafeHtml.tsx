"use client";

import React from "react";
import DOMPurify from "isomorphic-dompurify";

interface SafeHtmlProps {
  html: string;
  className?: string;
  as?: React.ElementType;
}

export function sanitizeHtmlStrict(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  const clean = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li",
      "b", "i", "strong", "em", "strike", "code", "hr", "br", "div",
      "table", "thead", "caption", "tbody", "tr", "th", "td", "pre", "span", "img",
      "blockquote"
    ],
    ALLOWED_ATTR: [
      "href", "name", "target", "src", "alt", "title", "class", "id", "rel"
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
  });

  // Force rel="noopener noreferrer" on external links if target="_blank" or links in general
  if (typeof window !== "undefined" || typeof DOMParser !== "undefined") {
    // Standard DOMPurify hook or string post-processing for SSR/CSR safety
    return clean.replace(/<a\s+([^>]*href=[^>]+)>/gi, (match) => {
      if (!match.includes('rel=')) {
        return match.replace('<a ', '<a rel="noopener noreferrer" ');
      }
      return match;
    });
  }
  return clean;
}

// Add DOMPurify hook for target attribute handling
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if ("target" in node && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, className, as: Component = "div" }) => {
  const cleanHtml = sanitizeHtmlStrict(html);

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};
