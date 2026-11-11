// Cache Components: params must be known at build time, otherwise the layout becomes request-time data.
export function generateStaticParams() {
  return [{ lang: "az" }, { lang: "en" }, { lang: "ru" }];
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
