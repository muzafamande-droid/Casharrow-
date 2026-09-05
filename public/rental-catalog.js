// AVEILOT rental catalog UI: fee + income presentation is rendered from the live /api/products response.
const state = { products: [], selectedProduct: null };
const money = (value) => `UGX ${Number(value || 0).toLocaleString()}`;

function productCard(product) {
  const fee = Number(product.fee || product.rental_fee || 0);
  const income = Number(product.return_amount || product.income || 0);
  const days = Number(product.duration_days || product.rental_days || 0);
  const image = product.image_url || "";
  const series = product.series || "PowerGen";
  const name = product.name || product.title || "PowerGen Machine";
  return `<article class="rental-product-card"><div class="rental-product-image-wrap">${image ? `<img class="rental-product-image" src="${image}" alt="${name}" loading="lazy">` : ""}<span class="rental-series-badge">${series} Series</span></div><div class="rental-product-body"><h3>${name}</h3><div class="rental-money-grid"><div class="rental-money-box"><span>Rental fee</span><strong>${money(fee)}</strong></div><div class="rental-money-box income-box"><span>Income</span><strong>${money(income)}</strong></div></div><div class="rental-product-meta"><span>⏱ ${days} days</span><span>Income after term</span></div><button class="rental-product-action" type="button" data-rent-product="${product.id}">Rent machine</button></div></article>`;
}

function ensureStyles() {
  if (document.getElementById("aveilot-rental-catalog-styles")) return;
  const style = document.createElement("style");
  style.id = "aveilot-rental-catalog-styles";
  style.textContent = `.rental-product-card{overflow:hidden;border-radius:20px;background:#fff;border:1px solid rgba(20,40,70,.12);box-shadow:0 10px 30px rgba(10,30,60,.08)}.rental-product-image-wrap{position:relative;aspect-ratio:4/3;background:#eef3f8;overflow:hidden}.rental-product-image{display:block;width:100%;height:100%;object-fit:cover}.rental-series-badge{position:absolute;top:12px;left:12px;padding:7px 10px;border-radius:999px;background:rgba(7,21,39,.9);color:#fff;font-size:11px;font-weight:800}.rental-product-body{padding:16px}.rental-product-body h3{margin:0 0 14px;font-size:18px}.rental-money-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px}.rental-money-box{padding:11px;border-radius:13px;background:#f3f6fa;border:1px solid #e3e9f0}.rental-money-box span{display:block;font-size:11px;color:#68778c;margin-bottom:4px;font-weight:700}.rental-money-box strong{display:block;font-size:15px}.rental-money-box.income-box{background:#edf8f1;border-color:#cdebd7}.rental-money-box.income-box strong{color:#147a3d}.rental-product-meta{display:flex;justify-content:space-between;gap:8px;margin:9px 0 14px;font-size:11px;color:#66758a}.rental-product-action{width:100%;border:0;border-radius:12px;padding:12px 14px;background:#132f52;color:#fff;font-weight:800;cursor:pointer}@media(max-width:480px){.rental-money-box strong{font-size:13px}.rental-product-body{padding:13px}}`;
  document.head.appendChild(style);
}

function findCatalogHost() { return document.querySelector("#rentalProducts, #rental-products, [data-rental-products], .rental-products, .products-grid"); }

async function loadRentalCatalog() {
  ensureStyles();
  const host = findCatalogHost();
  if (!host) return;
  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
    const data = await response.json();
    state.products = Array.isArray(data) ? data : (data.products || []);
    host.innerHTML = state.products.map(productCard).join("");
    host.querySelectorAll("[data-rent-product]").forEach((button) => button.addEventListener("click", () => {
      const product = state.products.find((item) => String(item.id) === String(button.dataset.rentProduct));
      if (product) openRentalDetails(product);
    }));
  } catch (error) {
    console.error("Unable to load AVEILOT rental catalog", error);
    host.innerHTML = '<div class="empty">Unable to load machines. Please try again.</div>';
  }
}

function openRentalDetails(product) {
  const fee = Number(product.fee || product.rental_fee || 0);
  const income = Number(product.return_amount || product.income || 0);
  const days = Number(product.duration_days || product.rental_days || 0);
  if (!window.confirm(`${product.name || "PowerGen Machine"}\n\nRental fee: ${money(fee)}\nIncome: ${money(income)}\nRental term: ${days} days\n\nContinue with this machine?`)) return;
  fetch("/api/rentals", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("casharrowToken") || ""}`},body:JSON.stringify({productId:product.id})})
    .then(async response => { const payload=await response.json().catch(()=>({})); if(!response.ok) throw new Error(payload.error || payload.message || "Rental could not be completed"); alert(`Machine rented successfully. Income: ${money(income)} after ${days} days.`); window.location.reload(); })
    .catch(error => alert(error.message));
}

window.cashArrowOpenMachines = async function openMachines() {
  const host = document.getElementById("machinesHost");
  if (!host) return;
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("open"));
  document.querySelectorAll(".nav").forEach((nav) => nav.classList.remove("active"));
  document.querySelector('[data-nav="machines"]')?.classList.add("active");
  host.style.display = "block";
  host.innerHTML = '<section class="panel open"><h2>🏭 AVEILOT Machines</h2><div id="rentalProducts" class="products-grid"><div class="loading">🏭 Loading machines…</div></div></section>';
  await loadRentalCatalog();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadRentalCatalog); else loadRentalCatalog();