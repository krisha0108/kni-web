import Link from "next/link";
import { POSTS } from "../blog/posts";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function LatestBlog() {
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <section id="blog" className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold uppercase text-gray-900 md:text-4xl lg:text-5xl">Latest Blog</h2>
          <p className="mt-2 text-gray-600">Tips &amp; guides for commercial kitchens</p>
        </div>
        <Link href="/blog" className="font-semibold text-[#E71720] hover:underline">
          View all posts →
        </Link>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="h-44 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <span className="mb-2 text-xs text-gray-400">{fmtDate(post.date)} • {post.readTime}</span>
              <h3 className="text-lg font-bold leading-snug text-gray-900 group-hover:text-[#E71720]">{post.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{post.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
