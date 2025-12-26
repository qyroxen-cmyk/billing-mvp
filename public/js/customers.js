const CUSTOMER_API = "/api/customers";

function toggleCustomerForm() {
  document.getElementById("customerForm").classList.toggle("hidden");
}

async function saveCustomer() {
  const customer = {
    name: document.getElementById("custName").value.trim(),
    phone: document.getElementById("custPhone").value.trim(),
    email: document.getElementById("custEmail").value.trim()
  };

  if (!customer.name || !customer.phone) {
    alert("Name and phone are required");
    return;
  }

  const res = await fetch(CUSTOMER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer)
  });

  if (!res.ok) {
    alert("Failed to save customer");
    return;
  }

  document.getElementById("customerForm").classList.add("hidden");

  // CLEAR FORM
  document.getElementById("custName").value = "";
  document.getElementById("custPhone").value = "";
  document.getElementById("custEmail").value = "";

  loadCustomers(); // 👈 THIS WAS MISSING / BROKEN
}

async function loadCustomers() {
  const res = await fetch(CUSTOMER_API);
  const customers = await res.json();

  const table = document.getElementById("customerTable");
  table.innerHTML = "";

  if (!Array.isArray(customers)) return;

  customers.forEach(c => {
    table.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.email || "-"}</td>
        <td>₹${Number(c.total_spent).toFixed(2)}</td>
      </tr>
    `;
  });
}

document.addEventListener("DOMContentLoaded", loadCustomers);
