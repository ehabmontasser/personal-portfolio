/* Career bar opens the matching role */
export function initCareerLinks() {
  document.querySelectorAll('[data-career-bar] a').forEach((link) => {
    link.addEventListener('click', () => {
      const company = document.querySelector(link.getAttribute('href'));
      const firstRole = company?.querySelector('details');
      if (firstRole) firstRole.open = true;
    });
  });
}
