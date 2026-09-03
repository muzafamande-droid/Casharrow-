(() => {
  if (window.__casharrowRentalUI) return;
  window.__casharrowRentalUI = true;

  const token = () => localStorage.getItem('casharrowToken');
  const money = value => `UGX ${Number(value || 0).toLocaleString()}`;

  async function api(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed');
    return data;
  }

  function ensureStyle() {
    if (document.getElementById('casharrowRentalUIStyle')) return;
    const style = document.createElement('style');
    style.id = 'casharrowRentalUIStyle';
    style.textContent = `
      .ca-rental-section{margin-top:24px}
      .ca-rental-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
      .ca-rental-head h2{font-size:20px;color:#07162f}
      .ca-rental-head span{font-size:11px;color:#718096}
      .ca-rental-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .ca-rental-card{background:#fff;border:1px solid rgba(17,76,160,.07);border-radius:20px;overflow:hidden;box-shadow:0 8px 22px rgba(17,45,88,.07)}
      .ca-rental-card img{display:block;width:100%;aspect-ratio:1.5;object-fit:cover;background:#07162f}
      .ca-rental-body{padding:13px}
      .ca-rental-body h3{font-size:15px;margin-bottom:5px;color:#172033}
      .ca-rental-body p{font-size:12px;line-height:1.45;color:#718096;margin-bottom:8px}
      .ca-rental-price{font-size:16px;font-weight:800;color:#0757e8;margin:5px 0}
      .ca-rental-meta{font-size:11px;color:#718096;margin-bottom:10px}
      .ca-rental-card button{width:100%}
      .ca-rental-card button:disabled{opacity:.65;cursor:not-allowed}
      .ca-my-rentals{margin-top:24px}
      .ca-rental-item{background:#fff;border:1px solid #e5ebf4;border-radius:18px;padding:15px;margin-bottom:10px;box-shadow:0 5px 16px rgba(17,45,88,.05)}
      .ca-rental-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .ca-rental-item h3{font-size:15px;margin-bottom:5px}
      .ca-rental-item p{font-size:12px;color:#718096;line-height:1.5}
      .ca-status{display:inline-block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;padding:5px 8px;border-radius:999px;background:#eaf2ff;color:#1769ff;white-space:nowrap}
      .ca-status.completed{background:#e8f8f0;color:#0a8f52}
      .ca-empty{background:#fff;border:1px dashed #cfd9e8;border-radius:18px;padding:20px;text-align:center;color:#718096;font-size:13px}
      .ca-rental-error{color:#c62828;background:#fff1f1;border-radius:12px;padding:11px;font-size:12px}
      @media(max-width:520px){.ca-rental-grid{grid-template-columns:1fr 1fr}.ca-rental-body{padding:10px}.ca-rental-body h3{font-size:13px}.ca-rental-body p{font-size:11px}.ca-rental-price{font-size:14px}}
    `;
    document.head.appendChild(style);
  }

  function productCard(product, canRent) {
    const configured = Number(product.rental_fee) > 0 && Number(product.rental_days) > 0;
    const available = Number(product.active) === 1 && configured;
    const image = product.image_url || '/product-placeholder.svg';
    let button = 'Coming soon';
    if (available && canRent) button = 'Rent product';
    else if (available) button = 'Login to rent';
    const disabled = !available || !canRent;
    return `<article class="ca-rental-card">
      <img src="${image}" alt="${product.name}">
      <div class="ca-rental-body">
        <h3>${product.code} · ${product.name.replace('CashArrow Generator ', '')}</h3>
        <p>${product.description || 'CashArrow rental product.'}</p>
        <div class="ca-rental-price">${configured ? money(product.rental_fee) : 'Terms pending'}</div>
        <div class="ca-rental-meta">${configured ? `${product.rental_days} days` : 'Rental terms will be published before activation'}</div>
        <button class="${available ? 'primary' : 'secondary'}" data-rent-product="${product.id}" ${disabled ? 'disabled' : ''}>${button}</button>
      </div>
    </article>`;
  }

  async function loadProducts() {
    const data = await api('/api/products');
    return data.products || [];
  }

  function mountFeatured(products) {
    const guest = document.getElementById('casharrowGuestHome');
    if (!guest) return;
    const grid = guest.querySelector('.casharrow-product-grid');
    if (!grid) return;
    const featured = products.filter(p => Number(p.featured) === 1).slice(0, 4);
    if (!featured.length) return;
    grid.innerHTML = featured.map(p => productCard(p, false)).join('');
    grid.querySelectorAll('[data-rent-product]').forEach(btn => {
      btn.disabled = false;
      btn.className = 'primary';
      btn.textContent = 'Login to rent';
      btn.onclick = () => typeof openModal === 'function' && openModal('login');
    });
  }

  function mountMemberProducts(products) {
    if (!token()) return;
    const old = document.getElementById('casharrowMemberProducts');
    if (old) old.remove();
    const container = document.querySelector('main.container');
    if (!container) return;
    const section = document.createElement('section');
    section.id = 'casharrowDynamicMemberProducts';
    section.className = 'ca-rental-section';
    section.innerHTML = `<div class="ca-rental-head"><h2>Rental Products</h2><span>${products.length} products</span></div><div class="ca-rental-grid">${products.map(p => productCard(p, true)).join('')}</div>`;
    const wallet = document.getElementById('userWallet');
    (wallet || container.firstElementChild)?.insertAdjacentElement('afterend', section);
    section.querySelectorAll('[data-rent-product]').forEach(btn => {
      btn.onclick = () => startRental(Number(btn.dataset.rentProduct), btn);
    });
  }

  async function startRental(productId, button) {
    if (!token()) { if (typeof openModal === 'function') openModal('login'); return; }
    try {
      const productData = await api(`/api/products/${productId}`);
      const p = productData.product;
      const ok = confirm(`Start ${p.code} rental?\n\nRental fee: ${money(p.rental_fee)}\nRental period: ${p.rental_days} days\n\nYour wallet will be charged only after you confirm.`);
      if (!ok) return;
      button.disabled = true;
      button.textContent = 'Starting...';
      const result = await api('/api/rentals', { method: 'POST', body: JSON.stringify({ productId }) });
      alert(`Rental started successfully.\n\nCompletion date: ${new Date(result.endAt).toLocaleString()}`);
      await refreshRentals();
      if (typeof loadWallet === 'function') await loadWallet();
      button.textContent = 'Rental active';
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = 'Rent product';
    }
  }

  async function refreshRentals() {
    if (!token()) return;
    let section = document.getElementById('casharrowMyRentals');
    if (!section) {
      const container = document.querySelector('main.container');
      if (!container) return;
      section = document.createElement('section');
      section.id = 'casharrowMyRentals';
      section.className = 'ca-my-rentals';
      container.appendChild(section);
    }
    try {
      const data = await api('/api/rentals');
      const rentals = data.rentals || [];
      section.innerHTML = `<div class="ca-rental-head"><h2>My Rentals</h2><span>${rentals.length} rental${rentals.length === 1 ? '' : 's'}</span></div>` +
        (rentals.length ? rentals.map(r => rentalMarkup(r)).join('') : '<div class="ca-empty">You have no rentals yet. Choose a generator above to get started.</div>');
    } catch (error) {
      section.innerHTML = `<div class="ca-rental-head"><h2>My Rentals</h2></div><div class="ca-rental-error">${error.message}</div>`;
    }
  }

  function rentalMarkup(r) {
    const end = new Date(r.end_at);
    const status = r.status === 'completed' ? 'completed' : 'active';
    return `<article class="ca-rental-item"><div class="ca-rental-row"><div><h3>${r.code} · ${r.name.replace('CashArrow Generator ', '')}</h3><p>Started: ${new Date(r.start_at).toLocaleString()}<br>Completion: ${end.toLocaleString()}<br>Rental fee: ${money(r.rental_fee)}<br>Return: ${r.return_amount == null ? 'Pending terms' : money(r.return_amount)}</p></div><span class="ca-status ${status}">${status}</span></div></article>`;
  }

  async function init() {
    ensureStyle();
    try {
      const products = await loadProducts();
      mountFeatured(products);
      if (token()) {
        mountMemberProducts(products);
        await refreshRentals();
      }
    } catch (error) {
      console.error('CashArrow rental UI failed:', error);
    }
  }

  window.cashArrowRefreshRentals = refreshRentals;
  window.cashArrowRentalInit = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
