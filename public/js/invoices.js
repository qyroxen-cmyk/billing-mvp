let items = [];
let total = 0;

async function loadProducts() {
  const res = await fetch("/products");
  const data = await res.json();
  product.innerHTML = data.map(
    p => `<option value='${JSON.stringify(p)}'>${p.name}</option>`
  ).join("");
}

function addItem() {
  const p = JSON.parse(product.value);
  const q = Number(qty.value);

  const gst = (p.sale_price * q) * (p.gst_rate / 100);
  const lineTotal = (p.sale_price * q) + gst;

  items.push({ name: p.name, qty: q, price: p.sale_price, gst, total: lineTotal });

  renderTable();
}

function renderTable() {
  const body = document.querySelector("#invoiceTable tbody");
  body.innerHTML = "";
  total = 0;

  items.forEach(i => {
    total += i.total;
    body.innerHTML += `
      <tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>₹${i.price}</td>
        <td>₹${i.gst.toFixed(2)}</td>
        <td>₹${i.total.toFixed(2)}</td>
      </tr>
    `;
  });

  grandTotal.innerText = `Grand Total: ₹${total.toFixed(2)}`;
}

async function saveInvoice() {
  await fetch("/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: customer.value,
      total,
      items
    })
  });

  items = [];
  renderTable();
  loadInvoices();
}

async function loadInvoices() {
  const res = await fetch("/invoices");
  const data = await res.json();

  invoiceBody.innerHTML = "";
  data.forEach(i => {
    invoiceBody.innerHTML += `
      <tr>
        <td>${i.id}</td>
        <td>${i.customer}</td>
        <td>₹${i.grand_total}</td>
        <td>
          <a href="/invoice/pdf/${i.id}" target="_blank">PDF</a> |
          <a href="https://wa.me/?text=Invoice%20Total:%20₹${i.grand_total}" target="_blank">WhatsApp</a>
        </td>
      </tr>
    `;
  });
}
