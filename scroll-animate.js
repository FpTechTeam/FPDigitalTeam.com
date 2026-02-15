// Select all products
const products = document.querySelectorAll('.product');

// Function to check if element is in viewport
function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85
  );
}

// Add 'scroll' class when element enters viewport
function animateOnScroll() {
  products.forEach(product => {
    if (isInViewport(product)) {
      product.classList.add('scroll');
    }
  });
}

// Initial check
animateOnScroll();

// Listen to scroll event
window.addEventListener('scroll', animateOnScroll);
