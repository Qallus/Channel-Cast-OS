import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CTABand } from "@/components/site/marketing";
import { POSTS, getPost, formatDate } from "@/lib/marketing/posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? { title: `${post.title} · Channel Cast`, description: post.excerpt } : { title: "Article · Channel Cast" };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <>
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:py-20">
        <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All resources</Link>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-brand-strong">{post.category}</span>
          <span>{formatDate(post.date)}</span>
          <span>· {post.readMins} min read</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="mt-8 space-y-5 text-[15px] leading-7 text-foreground/90">
          {post.body.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      </article>
      <CTABand title="See it in your space." subtitle="Explore ad space or set up a device." primary={{ label: "View ad space", href: "/marketplace" }} secondary={{ label: "How it works", href: "/how-it-works" }} />
    </>
  );
}
