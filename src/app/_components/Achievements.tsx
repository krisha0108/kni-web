export default function Achievements() {
  return (
    <>
          <section className="max-w-5xl mx-auto text-center px-5 mb-10">
            <h2
              className="text-3xl uppercase md:text-4xl lg:text-5xl text-center font-bold text-gray-900 py-8"
            >
              Achievements
            </h2>
            <div className="flex flex-wrap justify-center md:justify-between gap-6 mt-4">
              
              <div className="w-36 sm:w-44 flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full"
                >
                  <div
                    className="flex items-center justify-center w-16 h-16 border-2 border-red-500 rounded-full"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#E71720"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-check-check w-8 h-8"
                    >
                      <path d="M18 6 7 17l-5-5" />
                      <path d="m22 10-7.5 7.5L13 16" />
                    </svg>
                  </div>
                </div>
      
                <p className="mt-2 text-6xl font-black">2k+</p>
                <p className="text-xl text-gray-900">Project Done</p>
              </div>
      
              
              <div className="w-36 sm:w-44 flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full"
                >
                  <div
                    className="flex items-center justify-center w-16 h-16 border-2 border-red-500 rounded-full"
                  >
                    <img loading="lazy"
                      src="/landing/assests/HappyCustomers.svg"
                      alt="HappyCustomers"
                      className="w-8 h-8"
                    />
                  </div>
                </div>
                <p className="mt-2 text-6xl font-black">5k+</p>
                <p className="text-xl text-gray-900">Happy Customers</p>
              </div>
      
              
              <div className="w-36 sm:w-44 flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full"
                >
                  <div
                    className="flex items-center justify-center w-16 h-16 border-2 border-red-500 rounded-full"
                  >
                    <img loading="lazy"
                      src="/landing/assests/GreatReviews.svg"
                      alt="GreatReviews"
                      className="w-8 h-8"
                    />
                  </div>
                </div>
                <p className="mt-2 text-6xl font-black">12k+</p>
                <p className="text-xl text-gray-900">Great Reviews</p>
              </div>
      
              
              <div className="w-36 sm:w-44 flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full"
                >
                  <div
                    className="flex items-center justify-center w-16 h-16 border-2 border-red-500 rounded-full"
                  >
                    <img loading="lazy"
                      src="/landing/assests/SupportTeam.svg"
                      alt="SupportTeam"
                      className="w-8 h-8"
                    />
                  </div>
                </div>
                <p className="mt-2 text-6xl font-black">1k+</p>
                <p className="text-xl text-gray-900">Support Team</p>
              </div>
            </div>
          </section>
    </>
  );
}
