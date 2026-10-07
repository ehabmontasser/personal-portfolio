/* Hero figures count up once on load */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (prefersReducedMotion) return;

  const format = (value, el) =>
    el.dataset.format === 'thousands' ? value.toLocaleString('en-US') : String(value);

  counters.forEach((el) => {
    const target = Number(el.dataset.count);
    const duration = 1400;
    const delay = 500;
    let start = null;

    el.textContent = format(0, el);

    const step = (now) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(target * eased), el);
      if (t < 1) requestAnimationFrame(step);
    };

    setTimeout(() => requestAnimationFrame(step), delay);
  });
}
