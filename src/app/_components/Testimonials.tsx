import { db } from "@/server/db";

async function getTopReviews() {
  // Next.js pre-renders this page at build time (even with ISR), and the
  // database isn't reachable in every environment that runs a build — CI,
  // for one. Fail soft: if the query can't run, just show no testimonials
  // for that render instead of crashing the whole build. The real site's
  // scheduled revalidation (see revalidate in page.tsx) will pick up real
  // reviews once it's running against a live database.
  try {
    const ratings = await db.engineerRating.findMany({
      where: { isPublished: true, review: { not: null } },
      orderBy: [{ overallRating: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        overallRating: true,
        review: true,
        owner: { select: { name: true } },
        restaurant: { select: { name: true } },
      },
    });

    return ratings
      .filter((r) => r.review && r.review.trim().length > 0)
      .slice(0, 3);
  } catch (error) {
    console.error("Testimonials: failed to load reviews, hiding section for this render", error);
    return [];
  }
}

export default async function Testimonials() {
  const reviews = await getTopReviews();

  if (reviews.length === 0) return null;

  return (
    <section id="testimonial" className="bg-[#F6F6F6] py-12 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="pb-10 text-center text-3xl font-bold uppercase text-gray-900 md:text-4xl lg:text-5xl">
          Testimonials
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="flex flex-col rounded-2xl bg-white p-7 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <svg
                className="mb-4 h-9 w-9 text-[#E71720]/25"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7.17 6A5.17 5.17 0 0 0 2 11.17V18h6.83v-6.83H5.5A1.67 1.67 0 0 1 7.17 9.5V6Zm10 0A5.17 5.17 0 0 0 12 11.17V18h6.83v-6.83H15.5A1.67 1.67 0 0 1 17.17 9.5V6Z" />
              </svg>

              <div className="mb-3 text-lg tracking-wide text-[#E71720]" aria-label={`${r.overallRating} out of 5 stars`}>
                {"★".repeat(r.overallRating)}
                {"☆".repeat(5 - r.overallRating)}
              </div>

              <blockquote className="flex-1 leading-relaxed text-gray-600">{r.review}</blockquote>

              <figcaption className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E71720]/10 text-lg font-bold text-[#E71720]">
                  {r.owner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-[#E71720]">{r.owner.name}</h4>
                  <p className="text-sm text-gray-500">Owner{r.restaurant?.name ? ` – ${r.restaurant.name}` : ""}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
