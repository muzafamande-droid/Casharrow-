// CashArrow rental catalog: custom machine visuals + live rental data.
const state = { products: [], selectedProduct: null };
const money = (value) => `UGX ${Number(value || 0).toLocaleString()}`;

function machineVisual(code, name) {
  const m = String(code || name || 'A1').toUpperCase().match(/\b([ABCD][1-5])\b/);
  const c = m ? m[1] : 'A1';
  if (window.cashArrowRentalMachineSVG) return window.cashArrowRentalMachineSVG(c);
  const series = c[0], n = Number(c[1]);
  const widths = {A:330,B:380,C:430,D:490};
  const w = widths[series] + n * 12, x = (700-w)/2;
  const colors = {A:'#1688ff',B:'#0c73df',C:'#0759c9',D:'#0645ad'};
  const deep = {A:'#06356f',B:'#032a5b',C:'#021b42',D:'#01132f'};
  const main = colors[series], dark = deep[series];
  const top = 95 - n*7, bodyBottom = 325 + (series==='D'?20:0);
  const vents = Array.from({length:5+n},(_,i)=>`<rect x="${x+45}" y="${top+95+i*18}" width="${Math.max(90,w-175)}" height="7" rx="3" fill="#8fcfff" opacity=".5"/>`).join('');
  const leds = Array.from({length:Math.min(8,n+3)},(_,i)=>`<circle cx="${x+80+i*26}" cy="${top+65}" r="6" fill="${['#42e38d','#ffd54d','#62d6ff','#9e8cff'][i%4]}"/>`).join('');
  return `<svg class="casharrow-machine-image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 430" role="img" aria-label="CashArrow ${c} machine"><defs><linearGradient id="g${c}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#52b4ff"/><stop offset=".4" stop-color="${main}"/><stop offset="1" stop-color="${dark}"/></linearGradient><filter id="s${c}" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="9" flood-opacity=".28"/></filter></defs><rect width="700" height="430" rx="26" fill="#f3f8fd"/><ellipse cx="350" cy="392" rx="250" ry="18" fill="#092744" opacity=".14"/><g filter="url(#s${c})"><path d="M${x} ${bodyBottom}V${top+42}L${x+48} ${top}H${x+w-55}L${x+w} ${top+42}V${bodyBottom}L${x+w-38} ${bodyBottom+24}H${x+38}Z" fill="url(#g${c})" stroke="#a9ddff" stroke-width="6"/><path d="M${x+w-55} ${top}L${x+w} ${top+42}V${bodyBottom}L${x+w-38} ${bodyBottom+24}V${top+55}Z" fill="${dark}"/>${vents}<rect x="${x+48}" y="${top+55}" width="${Math.max(170,w-96)}" height="${series==='D'?175:145}" rx="20" fill="#062d63" stroke="#d8eeff" stroke-width="5"/><rect x="${x+75}" y="${top+80}" width="${Math.max(100,w-190)}" height="48" rx="9" fill="#000a1b" stroke="#72c9ff" stroke-width="3"/>${leds}<circle cx="${x+w-78}" cy="${top+125}" r="${series==='D'?43:34}" fill="#020a19" stroke="#d9efff" stroke-width="5"/><path d="M${x+w-108} ${top+134}A30 30 0 0 1 ${x+w-48} ${top+134}" fill="none" stroke="#1688ff" stroke-width="6"/><path d="M${x+w-78} ${top+125}l20 -20" stroke="#7ee5ff" stroke-width="5" stroke-linecap="round"/><rect x="${x+30}" y="${bodyBottom-18}" width="${w-60}" height="34" rx="9" fill="#020e24" stroke="#63b9f7" stroke-width="3"/><circle cx="${x+62}" cy="${bodyBottom+30}" r="25" fill="#02091a" stroke="#d7edff" stroke-width="4"/><circle cx="${x+w-62}" cy="${bodyBottom+30}" r="25" fill="#02091a" stroke="#d7edff" stroke-width="4"/></g><rect x="24" y="22" width="178" height="40" rx="20" fill="${main}"/><text x="113" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="900" fill="#fff">${series==='A'?'STARTER':series==='B'?'GROWTH':series==='C'?'PRO':'FLAGSHIP'} SERIES</text><rect x="512" y="22" width="164" height="40" rx="20" fill="#052653" stroke="#73c4ff"/><text x="594" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="900" fill="#dff2ff">${c} MACHINE</text></svg>`;
}

function productCard(product) {
  const fee = Number(product.fee || product.rental_fee || 0);
  const income = Number(product.return_amount || product.income || 0);
  const days = Number(product.duration_days || product.rental_days || 0);
  const series = product.series || "PowerGen";
  const name = product.name || product.title || "PowerGen Machine";
  const code = String(name).match(/\b[ABCD][1-5]\b/i)?.[0] || String(product.code || '').match(/\b[ABCD][1-5]\b/i)?.[0] || 'A1';
  return `<article class="rental-product-card"><div class="rental-product-image-wrap">${machineVisual(code,name)}<span class="rental-series-badge">${series} Series</span></div><div class="rental-product-body"><h3>${name}</h3><div class="rental-money-grid"><div class="rental-money-box"><span>Rental fee</span><strong>${money(fee)}</strong></div><div class="rental-money-box income-box"><span>Income</span><strong>${money(income)}</strong></div></div><div class="rental-product-meta"><span>⏱ ${days} days</span><span>Income after term</span></div><button class="rental-product-action" type="button" data-rent-product="${product.id}">Rent machine</button></div></article>`;
}

function ensureStyles() {
  if (document.getElementById("casharrow-rental-catalog-styles")) return;
  const style = document.createElement("style");
  style.id = "casharrow-rental-catalog-styles";
  style.textContent = `.rental-product-card{overflow:hidden;border-radius:20px;background:#fff;border:1px solid rgba(20,40,70,.12);box-shadow:0 10px 30px rgba(10,30,60,.08)}.rental-product-image-wrap{position:relative;aspect-ratio:4/3;background:#eef3f8;overflow:hidden}.casharrow-machine-image{display:block;width:100%;height:100%}.rental-series-badge{position:absolute;top:12px;left:12px;padding:7px 10px;border-radius:999px;background:rgba(7,21,39,.9);color:#fff;font-size:11px;font-weight:800}.rental-product-body{padding:16px}.rental-product-body h3{margin:0 0 14px;font-size:18px}.rental-money-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px}.rental-money-box{padding:11px;border-radius:13px;background:#f3f6fa;border:1px solid #e3e9f0}.rental-money-box span{display:block;font-size:11px;color:#68778c;margin-bottom:4px;font-weight:700}.rental-money-box strong{display:block;font-size:15px}.rental-money-box.income-box{background:#edf8f1;border-color:#cdebd7}.rental-money-box.income-box strong{color:#147a3d}.rental-product-meta{display:flex;justify-content:space-between;gap:8px;margin:9px 0 14px;font-size:11px;color:#66758a}.rental-product-action{width:100%;border:0;border-radius:12px;padding:12px 14px;background:#132f52;color:#fff;font-weight:800;cursor:pointer}@media(max-width:480px){.rental-money-box strong{font-size:13px}.rental-product-body{padding:13px}}`;
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
    console.error("Unable to load CashArrow rental catalog", error);
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
  host.innerHTML = '<section class="panel open"><h2>🏭 CashArrow Machines</h2><div id="rentalProducts" class="products-grid"><div class="loading">🏭 Loading machines…</div></div></section>';
  await loadRentalCatalog();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadRentalCatalog); else loadRentalCatalog();