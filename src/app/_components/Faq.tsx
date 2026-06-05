export default function Faq() {
  return (
    <>
          <div className="max-w-6xl mx-auto px-5 md:px-8 lg:px-16 my-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="px-6">
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl text-left font-bold text-gray-900 pb-8"
                >
                  Frequently Asked Questions
                </h2>
                <p className="text-gray-900 mb-6 max-w-sm">
                  KNI is more than just a marketplace; it’s a complete ecosystem built
                  to support the commercial kitchen industry, ensuring reliable
                  services and operational excellence for its users.
                </p>
                <a
                  href="#contact"
                  className="inline-block bg-[#E71720] text-white px-6 py-2 rounded hover:text-[#E71720] hover:bg-white border-[1px] border-[#E71720] transition-colors"
                >
                  Ask Anything
                </a>
              </div>
      
              
              <div className="space-y-4">
                
                <div
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <button
                    className="accordion-header w-full text-left p-4 font-medium focus:outline-none hover:bg-gray-50 transition-colors"
                  >
                    What types of kitchen equipment can I source through KNI?
                  </button>
                  <div className="accordion-content px-4">
                    <p className="text-gray-600">
                      KNI offers a wide range of commercial kitchen equipment
                      including ovens, refrigeration units, dishwashers, and more.
                    </p>
                  </div>
                </div>
      
                
                <div
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <button
                    className="accordion-header w-full text-left p-4 font-medium focus:outline-none hover:bg-gray-50 transition-colors"
                  >
                    How do I book a service for my kitchen equipment?
                  </button>
                  <div className="accordion-content px-4">
                    <p className="text-gray-600">
                      You can easily book a service through our online platform or
                      contact our customer support team.
                    </p>
                  </div>
                </div>
      
                
                <div
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <button
                    className="accordion-header w-full text-left p-4 font-medium focus:outline-none hover:bg-gray-50 transition-colors"
                  >
                    Does KNI provide Annual Maintenance Contracts (AMCs)?
                  </button>
                  <div className="accordion-content px-4">
                    <p className="text-gray-600">
                      Yes, KNI offers tailored AMC plans for commercial kitchen
                      equipment. These plans include regular maintenance, timely
                      repairs, and emergency support to minimize downtime.
                    </p>
                  </div>
                </div>
      
                
                <div
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <button
                    className="accordion-header w-full text-left p-4 font-medium focus:outline-none hover:bg-gray-50 transition-colors"
                  >
                    Can KNI help me design and optimize my kitchen layout?
                  </button>
                  <div className="accordion-content px-4">
                    <p className="text-gray-600">
                      Yes, our team of experts can help you design and optimize your
                      kitchen layout for maximum efficiency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </>
  );
}
