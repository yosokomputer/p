const initSiteUi = () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  const year = document.querySelector("#year");
  const revealItems = document.querySelectorAll(".reveal");

  if (menuToggle && nav && !menuToggle.dataset.bound) {
    menuToggle.dataset.bound = "true";
    menuToggle.addEventListener("click", () => {
      nav.classList.toggle("is-open");
    });
  }

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.14,
    }
  );

  revealItems.forEach((item) => observer.observe(item));
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSiteUi);
} else {
  initSiteUi();
}
