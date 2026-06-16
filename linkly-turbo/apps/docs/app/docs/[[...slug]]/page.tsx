import { source } from "../../../lib/source";
import { getMDXComponents } from "../../../components/mdx";
import { notFound } from "next/navigation";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>{page.data.title}</h1>
      {page.data.description && (
        <p className="text-muted-foreground text-lg">{page.data.description}</p>
      )}
      <MDX components={getMDXComponents()} />
    </article>
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
