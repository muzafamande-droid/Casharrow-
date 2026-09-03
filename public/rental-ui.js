(() => {
  if (window.__casharrowRentalUI) return;
  window.__casharrowRentalUI = true;

  const token = () => localStorage.getItem('casharrowToken');
  const money = value => `UGX ${Number(value || 0).toLocaleString()}`;
  const SERIES = {
    A: { days: 18, title: 'A Series', label: 'Starter rental series', icon: 'A' },
    B: { days: 28, title: 'B Series', label: 'Growth rental series', icon: 'B' },
    C: { days: 100, title: 'C Series', label: 'Extended rental series', icon: 'C' },
    D: { days: 120, title: 'D Series', label: 'Long-term rental series', icon: 'D' }
  };

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
      .ca-series-section{margin-top:24px}
      .ca-series-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}
      .ca-series-heading h2{font-size:21px;color:#07162f;letter-spacing:-.3px}
      .ca-series-heading p{font-size:11px;color:#718096;margin-top:4px}
      .ca-series-heading span{font-size:10px;font-weight:800;letter-spacing:.8px;color:#1769ff;background:#eaf2ff;padding:7px 9px;border-radius:999px;white-space:nowrap}
      .ca-series-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      .ca-series-card{position:relative;overflow:hidden;border:1px solid rgba(23,105,255,.09);border-radius:18px;background:linear-gradient(145deg,#fff,#f2f7ff);box-shadow:0 8px 20px rgba(17,45,88,.07);padding:11px;cursor:pointer;text-align:left;color:#07162f;min-width:0}
      .ca-series-card:before{content:"";position:absolute;width:62px;height:62px;right:-23px;top:-25px;border-radius:50%;background:rgba(32,199,255,.12)}
      .ca-series-card.active{border-color:rgba(23,105,255,.34);box-shadow:0 10px 24px rgba(7,87,232,.14);transform:translateY(-1px)}
      .ca-series-badge{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#07162f,#1769ff);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;margin-bottom:8px;box-shadow:0 5px 12px rgba(7,87,232,.18)}
      .ca-series-card h3{font-size:13px;margin-bottom:3px;white-space:nowrap}
      .ca-series-card p{font-size:10px;color:#718096;line-height:1.35;min-height:27px}
      .ca-series-days{font-size:10px;font-weight:800;color:#1769ff;margin-top:7px}
      .ca-series-arrow{position:absolute;right:9px;bottom:10px;font-size:14px;color:#1769ff}
      .ca-series-panel{margin-top:11px;display:none}
      .ca-series-panel.open{display:block;animation:caSeriesIn .2s ease}
      @keyframes caSeriesIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
      .ca-product-list{display:grid;gap:8px}
      .ca-product-row{display:grid;grid-template-columns:66px 1fr auto;align-items:center;gap:11px;background:#fff;border:1px solid #e6edf7;border-radius:16px;padding:8px;box-shadow:0 5px 15px rgba(17,45,88,.05)}
      .ca-product-row img{width:66px;height:55px;border-radius:12px;object-fit:cover;background:#07162f}
      .ca-product-info{min-width:0}
      .ca-product-info h3{font-size:13px;color:#172033;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ca-product-info p{font-size:10px;color:#718096;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ca-product-meta{text-align:right;min-width:72px}
      .ca-product-meta strong{display:block;font-size:11px;color:#1769ff}
      .ca-product-meta span{display:block;font-size:9px;color:#718096;margin-top:3px}
      .ca-product-meta button{font-size:9px;padding:7px 8px;margin-top:5px;white-space:nowrap}
      .ca-product-meta button:disabled{opacity:.62;cursor:not-allowed}
      .ca-series-note{background:#f5f8fd;border:1px dashed #ccd8e9;border-radius:13px;padding:10px;margin-bottom:9px;font-size:10px;line-height:1.45;color:#718096}
      .ca-my-rentals{margin-top:24px}
      .ca-rental-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
      .ca-rental-head h2{font-size:20px;color:#07162f}
      .ca-rental-head span{font-size:11px;color:#718096}
      .ca-rental-item{background:#fff;border:1px solid #e5ebf4;border-radius:18px;padding:15px;margin-bottom:10px;box-shadow:0 5px 16px rgba(17,45,88,.05)}
      .ca-rental-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .ca-rental-item h3{font-size:15px;margin-bottom:5px}.ca-rental-item p{font-size:12px;color:#718096;line-height:1.5}
      .ca-rental-actions{margin-top:12px}.ca-status{display:inline-block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;padding:5px 8px;border-radius:999px;background:#eaf2ff;color:#1769ff;white-space:nowrap}.ca-status.completed{background:#e8f8f0;color:#0a8f52}
      .ca-empty{background:#fff;border:1px dashed #cfd9e8;border-radius:18px;padding:20px;text-align:center;color:#718096;font-size:13px}
      .ca-rental-error{color:#c62828;background:#fff1f1;border-radius:12px;padding:11px;font-size:12px}
      body.ca-guest-mode .container>.section{display:none!important}
      body.ca-guest-mode #todayTasks,body.ca-guest-mode #rewardsSection,body.ca-guest-mode #teamSection{display:none!important}
      body.ca-guest-mode .bottom{display:none!important}
      @media(max-width:520px){
        .ca-series-grid{gap:6px}.ca-series-card{padding:9px;border-radius:15px}.ca-series-badge{width:30px;height:30px;border-radius:9px;font-size:12px;margin-bottom:6px}.ca-series-card h3{font-size:11px}.ca-series-card p{font-size:9px;min-height:24px}.ca-series-days{font-size:9px}.ca-series-arrow{right:7px;bottom:7px}
        .ca-product-row{grid-template-columns:54px 1fr auto;gap:8px;padding:7px}.ca-product-row img{width:54px;height:48px}.ca-product-info h3{font-size:12px}.ca-product-info p{font-size:9px}.ca-product-meta{min-width:63px}.ca-product-meta strong{font-size:10px}.ca-product-meta span{font-size:8px}.ca-product-meta button{font-size:8px;padding:6px}
      }
    `;
    document.head.appendChild(style);
  }

  function groupProducts(products) {
    return products.reduce((groups, product) => {
      const code = String(product.code || '').toUpperCase();
      const series = code.charAt(0);
      if (SERIES[series]) groups[series].push(product);
      return groups;
    }, { A: [], B: [], C: [], D: [] });
  }

  function productRow(product, canRent) {
    const configured = Number(product.rental_fee) > 0 && Number(product.rental_days) > 0 && product.return_amount != null;
    const active = Number(product.active) === 1;
    const available = active && configured;
    const image = product.image_url || '/product-placeholder.svg';
    const buttonText = available ? (canRent ? 'Rent' : 'Login') : 'Soon';
    return `<article class="ca-product-row">
      <img src="${image}" alt="${product.name || product.code}">
      <div class="ca-product-info"><h3>${product.code} · ${String(product.name || '').replace('CashArrow Generator ', '')}</h3><p>${product.description || 'CashArrow rental product.'}</p></div>
      <div class="ca-product-meta"><strong>${configured ? money(product.rental_fee) : 'Terms pending'}</strong><span>${configured ? `${product.rental_days} days` : 'Not active'}</span><button type="button" class="${available ? 'primary' : 'secondary'}" data-rent-product="${product.id}" ${available && canRent ? '' : (available ? '' : 'disabled')}>${buttonText}</button></div>
    </article>`;
  }

  function seriesCard(key, groups, openKey) {
    const s = SERIES[key];
    const sample = groups[key][0];
    return `<button type="button" class="ca-series-card ${openKey === key ? 'active' : ''}" data-series="${key}">
      <div class="ca-series-badge">${s.icon}</div><h3>${s.title}</h3><p>${s.label}</p><div class="ca-series-days">${s.days} days</div><span class="ca-series-arrow">${openKey === key ? '⌃' : '›'}</span>
    </button>`;
  }

  function seriesPanel(key, products, canRent) {
    const s = SERIES[key];
    return `<div class="ca-series-panel ${products.length ? 'open' : 'open'}" data-series-panel="${key}">
      <div class="ca-series-note"><strong>${s.title}</strong> · ${s.days}-day rental series. Select a product below to view its current configuration. Financial terms remain hidden until they are officially configured.</div>
      <div class="ca-product-list">${products.length ? products.map(p => productRow(p, canRent)).join('') : '<div class="ca-empty">Products for this series are being prepared.</div>'}</div>
    </div>`;
  }

  function buildSeriesUI(products, host, mode) {
    const groups = groupProducts(products);
    let openKey = host.dataset.openSeries || '';
    if (openKey && !groups[openKey].length) openKey = '';
    host.innerHTML = `<div class="ca-series-heading"><div><h2>${mode === 'guest' ? 'Explore CashArrow' : 'Rental Products'}</h2><p>${mode === 'guest' ? 'Choose a series to see what is inside.' : 'Choose a series to view its five products.'}</p></div><span>A · B · C · D</span></div><div class="ca-series-grid">${Object.keys(SERIES).map(k => seriesCard(k, groups, openKey)).join('')}</div>${openKey ? seriesPanel(openKey, groups[openKey], mode === 'member') : ''}`;
    host.querySelectorAll('[data-series]').forEach(btn => {
      btn.onclick = () => {
        const next = btn.dataset.series === host.dataset.openSeries ? '' : btn.dataset.series;
        host.dataset.openSeries = next;
        buildSeriesUI(products, host, mode);
        host.scrollIntoView({ behavior: 'smooth', block: 'start' });
        bindRentalButtons(host, mode === 'member');
      };
    });
    bindRentalButtons(host, mode === 'member');
  }

  function bindRentalButtons(host, canRent) {
    host.querySelectorAll('[data-rent-product]').forEach(btn => {
      btn.onclick = () => {
        if (!canRent) { if (typeof openModal === 'function') openModal('login'); return; }
        startRental(Number(btn.dataset.rentProduct), btn);
      };
    });
  }

  async function loadProducts() {
    const data = await api('/api/products');
    return data.products || [];
  }

  function mountGuest(products) {
    const old = document.getElementById('casharrowGuestHome');
    if (old) old.remove();
    const container = document.querySelector('main.container');
    if (!container) return;
    document.body.classList.add('ca-guest-mode');
    const balance = container.querySelector('.balance:not(#userWallet):not(#withdrawSection):not(#userTransactions)');
    if (balance) balance.style.display = 'none';
    const guest = document.createElement('section');
    guest.className = 'casharrow-guest-home'; guest.id = 'casharrowGuestHome'; guest.style.display = 'block';
    guest.innerHTML = `<div class="ca-series-section" id="casharrowGuestSeries"></div><div class="casharrow-auth-note" style="text-align:center;font-size:11px;color:#718096;margin-top:13px">Login or create an account to rent a product and manage your CashArrow account.</div>`;
    container.insertBefore(guest, container.firstElementChild);
    buildSeriesUI(products, guest.querySelector('#casharrowGuestSeries'), 'guest');
  }

  function mountMember(products) {
    document.body.classList.remove('ca-guest-mode');
    document.getElementById('casharrowGuestHome')?.remove();
    document.getElementById('casharrowMemberProducts')?.remove();
    document.getElementById('casharrowDynamicMemberProducts')?.remove();
    const container = document.querySelector('main.container'); if (!container) return;
    const section = document.createElement('section'); section.id = 'casharrowDynamicMemberProducts'; section.className = 'ca-series-section';
    const wallet = document.getElementById('userWallet');
    (wallet || container.firstElementChild)?.insertAdjacentElement('afterend', section);
    buildSeriesUI(products, section, 'member');
  }

  async function startRental(productId, button) {
    if (!token()) { if (typeof openModal === 'function') openModal('login'); return; }
    try {
      const productData = await api(`/api/products/${productId}`); const p = productData.product;
      const ok = confirm(`Start ${p.code} rental?\n\nRental fee: ${money(p.rental_fee)}\nRental period: ${p.rental_days} days\n\nYour wallet will be charged only after you confirm.`);
      if (!ok) return;
      button.disabled = true; button.textContent = 'Starting...';
      const result = await api('/api/rentals', { method: 'POST', body: JSON.stringify({ productId }) });
      alert(`Rental started successfully.\n\nCompletion date: ${new Date(result.endAt).toLocaleString()}`);
      await refreshRentals(); if (typeof loadWallet === 'function') await loadWallet(); button.textContent = 'Active';
    } catch (error) { alert(error.message); button.disabled = false; button.textContent = 'Rent'; }
  }

  async function completeRental(rentalId, button) {
    if (!token()) { if (typeof openModal === 'function') openModal('login'); return; }
    if (!confirm('Complete this rental and process its configured return amount?')) return;
    button.disabled = true; button.textContent = 'Processing...';
    try {
      const result = await api(`/api/rentals/${rentalId}/complete`, { method: 'POST' });
      alert(`Rental completed successfully.\n\nReturn credited: ${money(result.amount)}`);
      await refreshRentals(); if (typeof loadWallet === 'function') await loadWallet(); if (typeof loadTransactions === 'function') await loadTransactions();
    } catch (error) { alert(error.message); button.disabled = false; button.textContent = 'Complete rental'; }
  }

  async function refreshRentals() {
    if (!token()) return;
    let section = document.getElementById('casharrowMyRentals');
    if (!section) { const container = document.querySelector('main.container'); if (!container) return; section = document.createElement('section'); section.id = 'casharrowMyRentals'; section.className = 'ca-my-rentals'; container.appendChild(section); }
    try {
      const data = await api('/api/rentals'); const rentals = data.rentals || [];
      section.innerHTML = `<div class="ca-rental-head"><h2>My Rentals</h2><span>${rentals.length} rental${rentals.length === 1 ? '' : 's'}</span></div>` + (rentals.length ? rentals.map(r => rentalMarkup(r)).join('') : '<div class="ca-empty">You have no rentals yet. Choose a product from a series above to get started.</div>');
      section.querySelectorAll('[data-complete-rental]').forEach(btn => { btn.onclick = () => completeRental(Number(btn.dataset.completeRental), btn); });
    } catch (error) { section.innerHTML = `<div class="ca-rental-head"><h2>My Rentals</h2></div><div class="ca-rental-error">${error.message}</div>`; }
  }

  function rentalMarkup(r) {
    const end = new Date(r.end_at); const status = r.status === 'completed' ? 'completed' : 'active'; const ended = end.getTime() <= Date.now(); const canComplete = status === 'active' && ended && r.return_amount != null;
    const action = canComplete ? `<div class="ca-rental-actions"><button class="primary" type="button" data-complete-rental="${r.id}">Complete rental</button></div>` : '';
    return `<article class="ca-rental-item"><div class="ca-rental-row"><div><h3>${r.code} · ${String(r.name || '').replace('CashArrow Generator ', '')}</h3><p>Started: ${new Date(r.start_at).toLocaleString()}<br>Completion: ${end.toLocaleString()}<br>Rental fee: ${money(r.rental_fee)}<br>Return: ${r.return_amount == null ? 'Pending terms' : money(r.return_amount)}</p></div><span class="ca-status ${status}">${status}</span></div>${action}</article>`;
  }

  async function init() {
    ensureStyle();
    try {
      const products = await loadProducts();
      if (token()) { mountMember(products); await refreshRentals(); }
      else mountGuest(products);
    } catch (error) { console.error('CashArrow rental UI failed:', error); }
  }

  window.cashArrowRefreshRentals = refreshRentals;
  window.cashArrowRentalInit = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();