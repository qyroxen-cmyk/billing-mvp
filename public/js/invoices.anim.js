document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".card").forEach((c, i) => {
    c.style.opacity = 0;
    c.style.transform = "translateY(30px)";
    setTimeout(() => {
      c.style.transition = "0.5s ease";
      c.style.opacity = 1;
      c.style.transform = "translateY(0)";
    }, i * 150);
  });

  loadProducts();
  loadInvoices();
});
