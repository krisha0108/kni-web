import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Afacad } from "next/font/google";
import { POSTS, getPost } from "../posts";
import BlogShell from "../_BlogShell";
import "../blog.css";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | KNI Blog`,
    description: post.description,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      images: [`${SITE_URL}${post.image}`],
      publishedTime: post.date,
    },
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `${SITE_URL}${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "Kitchen Network International (KNI)" },
    publisher: {
      "@type": "Organization",
      name: "Kitchen Network International (KNI)",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/landing/assests/Kni-red-logo.webp` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
  };

  return (
    <div className={afacad.className}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogShell>
        <article className="mx-auto max-w-3xl px-5 py-10 lg:py-14">
          <nav className="mb-6 text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#E71720]">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:text-[#E71720]">Blog</Link>
          </nav>

          <div className="mb-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-[#E71720]/10 px-3 py-1 text-xs font-medium text-[#E71720]">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl font-bold leading-tight text-gray-900 md:text-4xl">{post.title}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-gray-400">
            <span>{fmtDate(post.date)}</span>
            <span>•</span>
            <span>{post.readTime}</span>
          </div>

          <div className="my-8 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt={post.title} className="h-auto w-full object-cover" />
          </div>

          <div className="blog-article" dangerouslySetInnerHTML={{ __html: post.content }} />

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-[#1D2254] p-8 text-center text-white">
            <h2 className="text-2xl font-bold">Need help with your commercial kitchen?</h2>
            <p className="mx-auto mt-2 max-w-xl text-gray-200">
              Talk to the KNI team about equipment, AMC, layout design or manpower.
            </p>
            <Link href="/#contact" className="mt-5 inline-block rounded-full bg-[#E71720] px-7 py-3 font-semibold transition-colors hover:bg-[#c9141c]">
              Get in Touch
            </Link>
          </div>
        </article>

        {/* Related posts */}
        <section className="mx-auto max-w-6xl px-5 pb-4 lg:px-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">More from the blog</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <h3 className="font-bold leading-snug text-gray-900 group-hover:text-[#E71720]">{r.title}</h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{r.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </BlogShell>
    </div>
  );
}
