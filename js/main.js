/* Ehab Montasser: site behaviour. No dependencies. */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header border on scroll + back-to-top ---------- */
  function initScrollChrome() {
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

  /* ---------- Mobile navigation ---------- */
  function initMobileNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const list = document.querySelector('[data-nav-list]');
    if (!toggle || !list) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      list.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    list.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Active section highlighting ---------- */
  function initActiveNav() {
    const links = [...document.querySelectorAll('[data-nav-link]')];
    const sections = links
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);
    if (!('IntersectionObserver' in window) || sections.length === 0) return;

    const setActive = (id) => {
      links.forEach((link) => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => observer.observe(section));

    // Above the first section, nothing is active
    const hero = document.querySelector('#top');
    if (hero) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) setActive(null);
      }, { threshold: [0.5] }).observe(hero);
    }
  }

  /* ---------- Hero figures count up once on load ---------- */
  function initCounters() {
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

  /* ---------- Career bar opens the matching role ---------- */
  function initCareerLinks() {
    document.querySelectorAll('[data-career-bar] a').forEach((link) => {
      link.addEventListener('click', () => {
        const company = document.querySelector(link.getAttribute('href'));
        const firstRole = company?.querySelector('details');
        if (firstRole) firstRole.open = true;
      });
    });
  }

  /* ---------- Booking form ---------- */
  function initBookingForm() {
    const form = document.querySelector('[data-book-form]');
    const status = document.querySelector('[data-form-status]');
    if (!form || !status) return;

    const messages = {
      firstName: 'Enter your first name.',
      lastName: 'Enter your last name.',
      email: 'Enter an email address like name@company.com.',
      phone: 'Enter a phone number using digits, spaces or a leading +.',
    };

    const validateField = (input) => {
      const error = document.getElementById(`${input.id}-error`);
      const value = input.value.trim();
      let valid = value.length > 0 && input.checkValidity();
      if (input.type === 'tel') valid = valid && value.replace(/\D/g, '').length >= 7;

      input.setAttribute('aria-invalid', String(!valid));
      if (error) {
        error.textContent = valid ? '' : messages[input.name];
        if (valid) input.removeAttribute('aria-describedby');
        else input.setAttribute('aria-describedby', error.id);
      }
      return valid;
    };

    const inputs = [...form.querySelectorAll('input')];

    // Validate after the visitor has interacted with a field, not while they type
    inputs.forEach((input) => {
      input.addEventListener('blur', () => {
        if (input.value.trim() !== '') validateField(input);
      });
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') validateField(input);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      status.hidden = true;

      const results = inputs.map(validateField);
      const firstInvalid = inputs[results.indexOf(false)];
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // No backend yet: confirm on the page
      const firstName = form.elements.firstName.value.trim();
      status.textContent = `Thank you, ${firstName}. Your request has been received successfully.`;
      status.hidden = false;
      form.reset();
      inputs.forEach((input) => input.removeAttribute('aria-invalid'));
    });
  }

  initScrollChrome();
  initMobileNav();
  initActiveNav();
  initCounters();
  initCareerLinks();
  initBookingForm();
})();
