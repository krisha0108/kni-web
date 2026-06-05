const TESTIMONIALS = [
  {
    img: "Testimonials1.png",
    name: "Piyush Patel",
    role: "CEO – Patel Restaurant",
    text: "The commercial oven we installed has taken our kitchen to the next level! It cooks food quickly, allowing us to maintain consistency in every dish. We've seen a significant boost in efficiency during our busiest hours.",
  },
  {
    img: "Testimonials2.png",
    name: "Janak Das",
    role: "Executive – Dosa Alem Restaurant",
    text: "The industrial-grade dishwasher has been a real time-saver! It handles large loads with ease and the full cycle keeps our kitchen running smoothly even during large events. It's a must-have for any catering business.",
  },
  {
    img: "Testimonials3.png",
    name: "Paresh Shah",
    role: "Owner – Horizon Hotel",
    text: "Our new commercial refrigeration units are top-notch. The well-thought-out installation gives ample space for all our supplies and keeps everything at the perfect temperature. It's made a big difference in managing our inventory and reducing waste.",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonial" className="bg-[#F6F6F6] py-12 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="pb-10 text-center text-3xl font-bold uppercase text-gray-900 md:text-4xl lg:text-5xl">
          Testimonials
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
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

              <div className="mb-3 text-lg tracking-wide text-[#E71720]" aria-label="5 out of 5 stars">
                ★★★★★
              </div>

              <blockquote className="flex-1 leading-relaxed text-gray-600">{t.text}</blockquote>

              <figcaption className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/landing/assests/${t.img}`}
                  alt={t.name}
                  className="h-12 w-12 shrink-0 rounded-full bg-gray-100 object-cover"
                  loading="lazy"
                />
                <div>
                  <h4 className="font-semibold text-[#E71720]">{t.name}</h4>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
