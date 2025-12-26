const API = "/api/products";

function toggleForm() {
  document.getElementById("productForm").classList.toggle("hidden");
}

async function saveProduct() {
  const product = {
    name: document.getElementById("name").value.trim(),
    code: document.getElementById("code").value.trim(),
    category: document.getElementById("category").value.trim(),
    stock: Number(document.getElementById("stock").value),
    lowStock: Number(document.getElementById("lowStock").value),
    description: document.getElementById("description").value.trim(),
    salePrice: Number(document.getElementById("salePrice").value),
    purchasePrice: Number(document.getElementById("purchasePrice").value),
    hsn: document.getElementById("hsn").value.trim(),
    gst: Number(document.getElementById("gst").value)
  };

  if (!product.name) {
    alert("Product name is required");
    return;
  }

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });

  if (res.ok) {
    toggleForm();
    loadProducts();
  }
}

async function loadProducts() {
  const res = await fetch(API);
  const products = await res.json();

  const table = document.getElementById("productTable");
  table.innerHTML = "";

  products.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.code || "-"}</td>
      <td>${p.category || "-"}</td>
      <td>${p.stock}</td>
      <td>₹${p.sale_price}</td>
    `;
    table.appendChild(row);
  });
}

loadProducts();
