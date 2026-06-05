import type { Metadata } from "next";
import Link from "next/link";
import { Afacad } from "next/font/google";
import { POSTS } from "./posts";
import BlogShell from "./_BlogShell";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export const metadata: Metadata = {
  title: "Blog — Commercial Kitchen Tips & Guides | KNI",
  description:
    "Expert guides on commercial kitchen equipment, AMC, layout design, cloud kitchens and maintenance from Kitchen Network International (KNI).",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    type: "website",
    title: "KNI Blog — Commercial Kitchen Tips & Guides",
    description: "Expert guides on commercial kitchen equipment, AMC, layout, cloud kitchens and maintenance.",
    url: `${SITE_URL}/blog`,
  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BlogIndex() {
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className={afacad.className}>
      <BlogShell>
        <section className="bg-gradient-to-br from-[#1D2254] via-[#2d3470] to-[#E71720] px-5 py-14 text-center text-white lg:py-20">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-bold md:text-5xl">KNI Blog</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-200">
              Practical guides and insights on commercial kitchen equipment, maintenance, design and operations.
            </p>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="h-48 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.tags.map((t) => (
                      <span key={t} className="rounded-full bg-[#E71720]/10 px-3 py-1 text-xs font-medium text-[#E71720]">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-lg font-bold leading-snug text-gray-900 group-hover:text-[#E71720]">
                    {post.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{post.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <span>{fmtDate(post.date)}</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </BlogShell>
    </div>
  );
}
