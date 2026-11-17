import { locales, type Localized } from "@/i18n/config";
import { dict } from "@/i18n/dictionaries";
import { href } from "@/i18n/routes";
import { NotFoundContent, type NotFoundStrings } from "@/components/layout/not-found-content";

// Server component: the dictionaries stay on the server; the client part gets only these strings.
export default function NotFound() {
  const strings = Object.fromEntries(
    locales.map((lang) => [lang, { ...dict(lang).notFound, home: href("home", lang) }]),
  ) as Localized<NotFoundStrings>;
  return <NotFoundContent strings={strings} />;
}
