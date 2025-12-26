(function protectRoute() {
  const token = localStorage.getItem("token");

  // If no token, redirect to login
  if (!token) {
    window.location.href = "login.html";
  }
})();
