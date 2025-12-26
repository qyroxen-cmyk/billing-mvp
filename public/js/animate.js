document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".kpi, .graph-card").forEach((el, i) => {
    el.style.animationDelay = `${i * 0.1}s`;
  });
});
