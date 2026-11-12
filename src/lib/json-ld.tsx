/** `<` and the JS line separators become \\uXXXX escapes (still valid JSON), so content can never close the tag. */
const escapeJson = (json: string) =>
  json.replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/** JSON-LD in a script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeJson(JSON.stringify(data)) }} />;
}
