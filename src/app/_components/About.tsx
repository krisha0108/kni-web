export default function About() {
  return (
    <>
          <section id="about" className="container mx-auto px-5 py-12 md:py-16">
            <div className="mx-auto max-w-6xl lg:px-8">
              
              <h2
                className="text-3xl uppercase md:text-4xl lg:text-5xl text-center font-bold text-gray-900 my-8"
              >
                About KNI
              </h2>
              <div
                className="flex flex-col lg:flex-row items-center justify-between gap-8"
              >
                
                <div className="w-full lg:w-1/2 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Kitchen Network International,
                    </h3>
                    <p className="text-gray-900 leading-relaxed">
                      popularly known as KNI, is a comprehensive service marketplace
                      designed exclusively for the commercial kitchen sector. KNI
                      bridges the gap between restaurant and resort owners and kitchen
                      equipment service professionals, offering a wide range of
                      services to meet diverse operational needs.
                    </p>
      
                    <p className="text-gray-900 leading-relaxed">
                      It streamlines the management of service bookings, service
                      calls, and tracking of service engineers, ensuring a seamless
                      experience for businesses operating in the hospitality industry.
                    </p>
                  </div>
                </div>
      
                
                <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
                  
                  <div className="w-full h-[300px] sm:h-[400px] lg:h-[450px]">
                    <img loading="lazy"
                      src="/landing/assests/aboutkni.webp"
                      alt="KNI Kitchen Staff and Operations"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
    </>
  );
}
