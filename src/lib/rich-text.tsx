import { Fragment, type ReactNode } from "react";
import type { RichDoc, RichMark, RichNode } from "@/features/pages/types";

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

const MAX_DEPTH = 12;

function withMarks(text: string, rawMarks: unknown, key: number): ReactNode {
  const marks = Array.isArray(rawMarks) ? (rawMarks as RichMark[]) : [];
  const content = marks.reduce<ReactNode>((child, mark) => {
    if (typeof mark !== "object" || mark === null) return child;
    switch (mark.type) {
      case "bold":
        return <strong>{child}</strong>;
      case "italic":
        return <em>{child}</em>;
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        if (!SAFE_HREF.test(href)) return child;
        const external = /^https?:/i.test(href);
        return (
          <a href={href} className="underline" {...(external ? { target: "_blank", rel: "noopener" } : {})}>
            {child}
          </a>
        );
      }
      default:
        return child;
    }
  }, text);
  return <Fragment key={key}>{content}</Fragment>;
}

function node(n: RichNode, i: number, depth = 0): ReactNode {
  // Data already in the database is not trusted: skip anything malformed or too deep.
  if (typeof n !== "object" || n === null || depth > MAX_DEPTH) return null;
  const kids = (Array.isArray(n.content) ? n.content : []).map((c, j) => node(c, j, depth + 1));
  switch (n.type) {
    case "paragraph":
      return <p key={i}>{kids}</p>;
    case "heading": {
      const level = n.attrs?.level === 3 ? 3 : 2;
      return level === 3 ? (
        <h3 key={i} className="text-subtitle-1-medium">
          {kids}
        </h3>
      ) : (
        <h2 key={i} className="pt-6 text-h5">
          {kids}
        </h2>
      );
    }
    case "bulletList":
      return (
        <ul key={i} className="list-disc pl-6">
          {kids}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={i} className="list-decimal pl-6">
          {kids}
        </ol>
      );
    case "listItem":
      return <li key={i}>{kids}</li>;
    case "hardBreak":
      return <br key={i} />;
    case "text":
      return typeof n.text === "string" ? withMarks(n.text, n.marks, i) : null;
    default:
      return null; // unknown node types are never rendered
  }
}

/**
 * Tiptap JSON → React elements. No HTML strings: everything is escaped by React.
 * Base style is the Figma page text (Body Text/Medium 16/24, gray-700; no gap between paragraphs).
 */
export function RichText({ doc, className }: { doc: RichDoc | null; className?: string }) {
  if (!doc || !Array.isArray(doc.content) || !doc.content.length) return null;
  return <div className={`text-body-md text-gray-700${className ? ` ${className}` : ""}`}>{doc.content.map((n, i) => node(n, i))}</div>;
}
