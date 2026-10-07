/* Ehab Montasser: site behaviour. Entry module for index.html. */
import { initScrollChrome } from './modules/scroll-chrome.js';
import { initMobileNav } from './modules/mobile-nav.js';
import { initActiveNav } from './modules/active-nav.js';
import { initCounters } from './modules/counters.js';
import { initCareerLinks } from './modules/career-links.js';
import { initBookingForm } from './modules/booking-form.js';

initScrollChrome();
initMobileNav();
initActiveNav();
initCounters();
initCareerLinks();
initBookingForm();
