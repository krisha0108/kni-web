  // Get the button
  const scrollToTopButton = document.getElementById('scrollToTop');

  // Show button when user scrolls down 100px from the top
  window.onscroll = function() {
      if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
          scrollToTopButton.classList.remove('hidden');
      } else {
          scrollToTopButton.classList.add('hidden');
      }
  };

  // When the user clicks on the button, scroll to the top smoothly
  scrollToTopButton.addEventListener('click', function() {
      window.scrollTo({
          top: 0,
          behavior: 'smooth'
      });
  });

  //Navbar fixed bg change js 
  const navbar = document.getElementById('mainNav');
  const videoBanner = document.querySelector('#home'); // Replace with your video banner's ID

  function updateNavbar() {
      // Get video banner's height (or use a fixed value if you prefer)
      const bannerHeight = videoBanner ? videoBanner.offsetHeight : 300; // 300px fallback
      
      if (window.scrollY > 100) { // Start transition earlier for smoother effect
          navbar.classList.add('navbar-scrolled');
      } else {
          navbar.classList.remove('navbar-scrolled');
      }
  }

  // Add scroll event listener
  window.addEventListener('scroll', function() {
      requestAnimationFrame(updateNavbar);
  });

  // Run once on page load
  updateNavbar();


// navbar navigate section 

document.addEventListener('DOMContentLoaded', function() {
  // Get all navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  
  // Get all sections that correspond to nav links
  const sections = Array.from(navLinks).map(link => 
      document.getElementById(link.getAttribute('data-scroll'))
  ).filter(Boolean);

  // Function to handle smooth scrolling
  function smoothScroll(target) {
      const element = document.getElementById(target);
      if (element) {
          updateURL(target);
          element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
          });
      }
  }

  // Function to update URL
  function updateURL(sectionId) {
      window.history.replaceState(null, '', '/#' + sectionId);
  }

  // Function to determine if an element is in viewport
  function isInViewport(element) {
      const rect = element.getBoundingClientRect();
      const buffer = 100; // Buffer zone of 100px
      return (
          rect.top <= buffer &&
          rect.bottom >= buffer
      );
  }

  // Function to update active link and URL
  function updateActiveLink() {
      let activeSection = sections.find(section => isInViewport(section));
      
      if (activeSection) {
          // Update URL without adding to browser history
          updateURL(activeSection.id);
          
          // Update nav links' active state
          navLinks.forEach(link => {
              const target = link.getAttribute('data-scroll');
              if (target === activeSection.id) {
                  link.style.color = 'red';
              } else {
                  link.style.color = ''; // Reset to default color
              }
          });
      }
  }

  // Add click event listener to each link
  navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
          e.preventDefault();
          const target = this.getAttribute('data-scroll');
          smoothScroll(target);
      });
  });

  // Handle initial page load and refresh
  function handleInitialLoad() {
      let target;
      
      if (window.location.hash) {
          target = window.location.hash.substring(1);
      } else if (window.location.pathname.length > 1) {
          target = window.location.pathname.substring(1);
          updateURL(target);
      }

      if (target) {
          setTimeout(() => {
              const element = document.getElementById(target);
              if (element) {
                  element.scrollIntoView({
                      behavior: 'auto',
                      block: 'start'
                  });
                  updateActiveLink();
              }
          }, 0);
      }
  }

  // Call on initial load
  handleInitialLoad();

  // Handle browser back/forward buttons
  window.addEventListener('popstate', function() {
      handleInitialLoad();
  });

  // Add scroll event listener with throttling
  let scrollTimeout;
  window.addEventListener('scroll', function() {
      if (!scrollTimeout) {
          scrollTimeout = setTimeout(function() {
              updateActiveLink();
              scrollTimeout = null;
          }, 100); // Throttle to run max once every 100ms
      }
  });
});
// document.addEventListener('DOMContentLoaded', function() {
//   // Get all navigation links
//   const navLinks = document.querySelectorAll('.nav-link');
  
//   // Get all sections that correspond to nav links
//   const sections = Array.from(navLinks).map(link => 
//       document.getElementById(link.getAttribute('data-scroll'))
//   ).filter(Boolean);

//   // Function to handle smooth scrolling
//   function smoothScroll(target) {
//       const element = document.getElementById(target);
//       if (element) {
//           window.history.pushState(null, '', '/#' + target);
          
//           element.scrollIntoView({
//               behavior: 'smooth',
//               block: 'start'
//           });
//       }
//   }

//   // Function to determine if an element is in viewport
//   function isInViewport(element) {
//       const rect = element.getBoundingClientRect();
//       const buffer = 100; // Buffer zone of 100px
//       return (
//           rect.top <= buffer &&
//           rect.bottom >= buffer
//       );
//   }

//   // Function to update active link
//   function updateActiveLink() {
//       let activeSection = null;
      
//       // Find the current active section
//       sections.forEach(section => {
//           if (isInViewport(section)) {
//               activeSection = section;
//           }
//       });

//       // Update nav links' active state
//       navLinks.forEach(link => {
//           const target = link.getAttribute('data-scroll');
//           if (activeSection && target === activeSection.id) {
//               link.style.color = 'red';
//           } else {
//               link.style.color = ''; // Reset to default color
//           }
//       });
//   }

//   // Add click event listener to each link
//   navLinks.forEach(link => {
//       link.addEventListener('click', function(e) {
//           e.preventDefault();
//           const target = this.getAttribute('data-scroll');
//           smoothScroll(target);
//       });
//   });

//   // Handle initial page load and refresh
//   function handleInitialLoad() {
//       let target;
      
//       if (window.location.hash) {
//           target = window.location.hash.substring(1);
//       } else if (window.location.pathname.length > 1) {
//           target = window.location.pathname.substring(1);
//           window.history.replaceState(null, '', '/#' + target);
//       }

//       if (target) {
//           setTimeout(() => {
//               const element = document.getElementById(target);
//               if (element) {
//                   element.scrollIntoView({
//                       behavior: 'auto',
//                       block: 'start'
//                   });
//                   updateActiveLink();
//               }
//           }, 0);
//       }
//   }

//   // Call on initial load
//   handleInitialLoad();

//   // Handle browser back/forward buttons
//   window.addEventListener('popstate', function() {
//       handleInitialLoad();
//   });

//   // Add scroll event listener to update active link
//   window.addEventListener('scroll', function() {
//       updateActiveLink();
//   });
// });
// our proccess js


// Testimonials swiper js 
const swiper = new Swiper('.testimonials-swiper', {
  slidesPerView: 1,
  spaceBetween: 30,
  loop: false,
  navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
  },
});
const servicesSwiper = new Swiper('.services-swiper', {
  slidesPerView: 1,
  spaceBetween: 20,
  loop: false,
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  breakpoints: {
    // when window width is >= 640px
    640: {
      slidesPerView: 2,
      spaceBetween: 20
    }
  }
});
//faq js 

document.querySelectorAll(".accordion-header").forEach((button) => {
    button.addEventListener("click", () => {
      const content = button.nextElementSibling;

      // Check if this content is already active
      const isActive = content.classList.contains("active");

      // Close all accordions
      document.querySelectorAll(".accordion-content").forEach((content) => {
        content.style.maxHeight = null; // Reset max-height
        content.classList.remove("active");
      });

      // If the clicked accordion wasn't active, open it
      if (!isActive) {
        content.classList.add("active");
        content.style.maxHeight = content.scrollHeight + "px"; // Set max-height dynamically
      }
    });
  });


//   navbar js 
const words = [
    "Seamless Service Bookings",
    "Effortless Equipment Selection",
    "Expert AMC Solutions",
    "Tailored Kitchen Consultations",
    "Real-Time Engineer Tracking",
    "Innovative Operational Tools",
    "Reliable Manpower Sourcing",
    "Simplified Maintenance Services",
    "Efficient Resource Management",
    "Exceptional Customer Experiences",
  ];
  
  const dynamicText = document.querySelector(".dynamic-text");
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isWaiting = false;
  
  function typeEffect() {
    const currentWord = words[wordIndex];
  
    // Ensure placeholder text remains visible during typing
    if (!dynamicText.classList.contains('filled')) {
      dynamicText.classList.add('filled');
    }
  
    if (!isDeleting && charIndex <= currentWord.length) {
      dynamicText.textContent = currentWord.substring(0, charIndex);
      charIndex++;
    }
  
    if (isDeleting && charIndex >= 0) {
      dynamicText.textContent = currentWord.substring(0, charIndex);
      charIndex--;
    }
  
    if (!isDeleting && charIndex === currentWord.length) {
      isWaiting = true;
      setTimeout(() => {
        isDeleting = true;
        isWaiting = false;
      }, 1200); // Pause before deletion
    }
  
    if (isDeleting && charIndex === 0) {
      wordIndex = (wordIndex + 1) % words.length;
      isDeleting = false;
    }
  
    const typingSpeed = isDeleting ? 50 : 100;
    const delay = isWaiting ? 0 : typingSpeed;
  
    setTimeout(typeEffect, delay);
  }
  
  // Start the effect
  typeEffect();
  