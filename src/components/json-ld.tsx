import {
  breadcrumbJsonLd,
  newsCollectionJsonLd,
  organizationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function HomeJsonLd() {
  return <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />;
}

export function NewsJsonLd() {
  return (
    <JsonLd
      data={[
        newsCollectionJsonLd(),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "News", path: "/news" },
        ]),
      ]}
    />
  );
}

export function PageJsonLd({
  title,
  description,
  path,
  breadcrumbs,
}: {
  title: string;
  description: string;
  path: string;
  breadcrumbs: { name: string; path: string }[];
}) {
  return (
    <JsonLd
      data={[webPageJsonLd(title, description, path), breadcrumbJsonLd(breadcrumbs)]}
    />
  );
}
