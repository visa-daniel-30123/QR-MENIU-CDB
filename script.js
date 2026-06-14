const navButtons = document.querySelectorAll(".nav__btn");
const categories = document.querySelectorAll(".category");

function filterCategory(selected) {
  categories.forEach((section) => {
    const cat = section.dataset.category;
    const show = selected === "all" || cat === selected;
    section.classList.toggle("category--hidden", !show);
  });
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("nav__btn--active"));
    btn.classList.add("nav__btn--active");
    filterCategory(btn.dataset.category);
  });
});
