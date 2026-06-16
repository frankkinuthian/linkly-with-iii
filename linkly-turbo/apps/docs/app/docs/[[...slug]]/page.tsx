import { source } from "../../../lib/source";
import { getMDXComponents } from "../../../components/mdx";
import { notFound } from "next/navigation";
import { DocsPage, DocsBody } from "fumadocs-ui/page";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage>
      <DocsBody>
        <h1>{page.data.title}</h1>
        {page.data.description && (
          <p className="text-fd-muted-foreground text-lg -mt-2 mb-8">
            {page.data.description}
          </p>
        )}
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
