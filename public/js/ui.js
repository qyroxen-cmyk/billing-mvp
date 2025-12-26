function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

/* ---------- PROFILE + LOGOUT ---------- */
function loadProfile() {
  const email = localStorage.getItem("email") || "User";
  const role = localStorage.getItem("role") || "staff";

  const emailEl = document.getElementById("profileEmail");
  const roleEl = document.getElementById("profileRole");

  if (emailEl) emailEl.innerText = email;
  if (roleEl) roleEl.innerText = role.toUpperCase();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("email");

  window.location.href = "login.html";
}
