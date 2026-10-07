/* Header border on scroll + back-to-top */
export function initScrollChrome() {
  const header = document.querySelector('[data-header]');
  const toTop = document.querySelector('[data-to-top]');
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    toTop?.classList.toggle('is-visible', y > window.innerHeight * 0.9);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
}
