async function loadDashboardStats() {
  const res = await fetch("/dashboard/stats");
  const data = await res.json();

  document.getElementById("monthlySales").innerText =
    "₹" + data.monthlySales.toLocaleString();

  document.getElementById("dailySales").innerText =
    "₹" + data.dailySales.toLocaleString();

  document.getElementById("profit").innerText =
    "₹" + data.profit.toLocaleString();
}

async function loadDashboardGraph() {
  const res = await fetch("/dashboard/graph");
  const rows = await res.json();

  const labels = rows.map(r => r.day);
  const values = rows.map(r => r.total);

  new Chart(document.getElementById("salesChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Sales",
        data: values,
        borderWidth: 3,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

loadDashboardStats();
loadDashboardGraph();


// PRODUCT PART - added
async function addProduct() {
  const product = {
    name: name.value,
    code: code.value,
    category: category.value,
    stock: stock.value,
    low_stock: low_stock.value,
    low_stock_alert: low_stock_alert.value,
    sale_price: sale_price.value,
    purchase_price: purchase_price.value,
    gst_rate: gst_rate.value,
    hsn: hsn.value,
    description: description.value
  };

  await fetch("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });

  loadProducts();
}

async function loadProducts() {
  const res = await fetch("/products");
  const data = await res.json();

  productBody.innerHTML = "";

  data.forEach(p => {
    productBody.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.stock}</td>
        <td>₹${p.sale_price}</td>
        <td>${p.gst_rate}%</td>
      </tr>
    `;
  });
}

async function addCustomer() {
  const name = cname.value;
  const phone = phone.value;

  if (!name || !phone) {
    alert("All fields required");
    return;
  }

  await fetch("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone })
  });

  cname.value = "";
  phone.value = "";

  loadCustomers();
}

async function loadCustomers() {
  const res = await fetch("/customers");
  const data = await res.json();

  customerBody.innerHTML = "";

  data.forEach(c => {
    customerBody.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.invoiceCount}</td>
        <td>₹${c.totalSpent}</td>
      </tr>
    `;
  });
}

