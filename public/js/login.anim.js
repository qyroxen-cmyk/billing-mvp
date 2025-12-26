document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector(".login-card");

  card.style.opacity = 0;
  card.style.transform = "scale(0.9)";

  setTimeout(() => {
    card.style.transition = "0.6s ease";
    card.style.opacity = 1;
    card.style.transform = "scale(1)";
  }, 100);
});
