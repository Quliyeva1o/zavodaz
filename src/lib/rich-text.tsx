import { Fragment, type ReactNode } from "react";
import type { RichDoc, RichMark, RichNode } from "@/features/pages/types";

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

function withMarks(text: string, marks: RichMark[] = [], key: number): ReactNode {
  const content = marks.reduce<ReactNode>((child, mark) => {
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

function node(n: RichNode, i: number): ReactNode {
  const kids = (n.content ?? []).map(node);
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
      return withMarks(n.text ?? "", n.marks, i);
    default:
      return null; // unknown node types are never rendered
  }
}

/**
 * Tiptap JSON → React elements. No HTML strings: everything is escaped by React.
 * Base style is the Figma page text (Body Text/Medium 16/24, gray-700; no gap between paragraphs).
 */
export function RichText({ doc, className }: { doc: RichDoc | null; className?: string }) {
  if (!doc?.content?.length) return null;
  return <div className={`text-body-md text-gray-700${className ? ` ${className}` : ""}`}>{doc.content.map(node)}</div>;
}
