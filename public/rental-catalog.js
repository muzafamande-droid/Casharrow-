// AVEILOT rental catalog: admin-managed machine photos + live rental and stock data.
const state = { products: [], selectedProduct: null };
const money = (value) => `UGX ${Number(value || 0).toLocaleString()}`;

function productImage(product) {
  const url = String(product.image_url || product.imageUrl || '').trim();
  const name = String(product.name || 'AVEILOT machine').replace(/["<>]/g, '');
  if (!url) return `<div class="machine-image-missing"><div>AVEILOT</div><span>Machine photo not set</span></div>`;
  const safe = url.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<img class="admin-machine-image" src="${safe}" alt="${name}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><div class="machine-image-missing image-load-fallback" style="display:none"><div>AVEILOT</div><span>Machine photo unavailable</span></div>`;
}

function productCard(product) {
  const fee = Number(product.fee || product.rental_fee || 0);
  const income = Number(product.return_amount || product.income || 0);
  const days = Number(product.duration_days || product.rental_days || 0);
  const series = product.series || "PowerGen";
  const name = product.name || product.title || "PowerGen Machine";
  const total = Number(product.inventory_total ?? 5);
  const available = Math.max(Number(product.available_count ?? total), 0);
  const soldOut = available <= 0;
  const stockText = soldOut ? "Sold out" : `${available} available`;
  const action = soldOut ? `<button class="rental-product-action sold-out" type="button" disabled>Sold out</button>` : `<button class="rental-product-action" type="button" data-rent-product="${product.id}">Rent machine</button>`;
  return `<article class="rental-product-card ${soldOut ? "is-sold-out" : ""}"><div class="rental-product-image-wrap">${productImage(product)}<span class="rental-series-badge">${series} Series</span>${soldOut ? '<span class="rental-stock-badge sold">Sold out</span>' : `<span class="rental-stock-badge">${stockText}</span>`}</div><div class="rental-product-body"><h3>${name}</h3><div class="rental-money-grid"><div class="rental-money-box"><span>Rental fee</span><strong>${money(fee)}</strong></div><div class="rental-money-box income-box"><span>Income</span><strong>${money(income)}</strong></div></div><div class="rental-product-meta"><span>⏱ ${days} days</span><span>${soldOut ? "Next release coming later" : stockText}</span></div>${action}</div></article>`;
}

function ensureStyles() {
  if (document.getElementById("aveilot-rental-catalog-styles")) return;
  const style = document.createElement("style");
  style.id = "aveilot-rental-catalog-styles";
  style.textContent = `.rental-product-card{overflow:hidden;border-radius:20px;background:#fff;border:1px solid rgba(20,40,70,.12);box-shadow:0 10px 30px rgba(10,30,60,.08)}.rental-product-card.is-sold-out{opacity:.82}.rental-product-image-wrap{position:relative;aspect-ratio:4/3;background:#eef3f8;overflow:hidden}.admin-machine-image{display:block;width:100%;height:100%;object-fit:cover;background:#eef3f8}.machine-image-missing{width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;background:linear-gradient(145deg,#07182e,#12375d);color:#fff}.machine-image-missing div{font-size:28px;font-weight:900;letter-spacing:3px}.machine-image-missing span{font-size:11px;opacity:.75}.rental-series-badge{position:absolute;top:12px;left:12px;padding:7px 10px;border-radius:999px;background:rgba(7,21,39,.9);color:#fff;font-size:11px;font-weight:800;z-index:3}.rental-stock-badge{position:absolute;right:12px;top:12px;padding:7px 10px;border-radius:999px;background:rgba(18,122,61,.92);color:#fff;font-size:11px;font-weight:900;z-index:3}.rental-stock-badge.sold{background:rgba(116,35,35,.94)}.rental-product-body{padding:16px}.rental-product-body h3{margin:0 0 14px;font-size:18px}.rental-money-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px}.rental-money-box{padding:11px;border-radius:13px;background:#f3f6fa;border:1px solid #e3e9f0}.rental-money-box span{display:block;font-size:11px;color:#68778c;margin-bottom:4px;font-weight:700}.rental-money-box strong{display:block;font-size:15px}.rental-money-box.income-box{background:#edf8f1;border-color:#cdebd7}.rental-money-box.income-box strong{color:#147a3d}.rental-product-meta{display:flex;justify-content:space-between;gap:8px;margin:9px 0 14px;font-size:11px;color:#66758a}.rental-product-action{width:100%;border:0;border-radius:12px;padding:12px 14px;background:#132f52;color:#fff;font-weight:800;cursor:pointer}.rental-product-action.sold-out{background:#d7dde5;color:#5e6875;cursor:not-allowed}@media(max-width:480px){.rental-money-box strong{font-size:13px}.rental-product-body{padding:13px}}`;
  document.head.appendChild(style);
}

function findCatalogHost() { return document.querySelector("#rentalProducts, #rental-products, [data-rental-products], .rental-products, .products-grid"); }

async function loadRentalCatalog() {
  ensureStyles();
  const host = findCatalogHost();
  if (!host) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/products", { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
    const data = await response.json();
    state.products = Array.isArray(data) ? data : (data.products || []);
    if (!Array.isArray(state.products)) throw new Error("Invalid products response");
    host.innerHTML = state.products.length ? state.products.map(productCard).join("") : '<div class="empty">No machines are currently available.</div>';
    host.querySelectorAll(".admin-machine-image").forEach((image) => image.addEventListener("error", () => { image.style.display = "none"; image.nextElementSibling?.classList.add("show"); }, { once: true }));
    host.querySelectorAll("[data-rent-product]").forEach((button) => button.addEventListener("click", () => {
      const product = state.products.find((item) => String(item.id) === String(button.dataset.rentProduct));
      if (product) openRentalDetails(product);
    }));
  } catch (error) {
    console.error("Unable to load AVEILOT rental catalog", error);
    const message = error?.name === "AbortError" ? "Machine service took too long to respond." : (error?.message || "Unable to load machines.");
    host.innerHTML = `<div class="empty"><strong>Unable to load machines.</strong><br><span>${message}</span><br><button type="button" onclick="window.cashArrowOpenMachines?.()">Try again</button></div>`;
  } finally { clearTimeout(timeout); }
}

function openRentalDetails(product) {
  const available = Math.max(Number(product.available_count ?? 0), 0);
  if (available <= 0) { alert("This machine is sold out. Please wait for the next AVEILOT machine release."); return; }
  const fee = Number(product.fee || product.rental_fee || 0);
  const income = Number(product.return_amount || product.income || 0);
  const days = Number(product.duration_days || product.rental_days || 0);
  if (!window.confirm(`${product.name || "PowerGen Machine"}\n\nRental fee: ${money(fee)}\nIncome: ${money(income)}\nRental term: ${days} days\nMachines available: ${available}\n\nContinue with this machine?`)) return;
  fetch("/api/rentals", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("casharrowToken") || ""}`},body:JSON.stringify({productId:product.id})})
    .then(async response => { const payload=await response.json().catch(()=>({})); if(!response.ok) throw new Error(payload.error || payload.message || "Rental could not be completed"); alert(`Machine rented successfully. ${Number(payload.inventoryAvailable ?? Math.max(available - 1, 0))} machines remain available.`); window.location.reload(); })
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
