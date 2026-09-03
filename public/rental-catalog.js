(() => {
  if (window.__casharrowRentalCatalog) return;
  window.__casharrowRentalCatalog = true;

  const POLICY = {
    A: { days: 18, label: 'Starter rental series', products: [[30000,45000],[70000,250000],[100000,400000],[150000,600000],[200000,850000]] },
    B: { days: 28, label: 'Growth rental series', products: [[40000,240000],[80000,600000],[100000,1280000],[250000,3040000],[450000,4150000]] },
    C: { days: 100, label: 'Extended rental series', products: [[100000,1200000],[250000,2080000],[400000,4450000],[500000,6800000],[800000,11250000]] },
    D: { days: 120, label: 'Long-term rental series', products: [[200000,4000000],[350000,6500000],[500000,8000000],[850000,18050000],[1000000,22000000]] }
  };

  const money = n => `UGX ${Number(n).toLocaleString()}`;
  const hasToken = () => !!localStorage.getItem('casharrowToken');

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function fallbackProducts() {
    return Object.entries(POLICY).flatMap(([series, cfg]) => cfg.products.map((term, index) => ({
      id: null,
      series,
      code: `${series}${index + 1}`,
      name: `CashArrow Generator ${series}${index + 1}`,
      description: `${series} Series rental product · ${cfg.days} days`,
      image_url: '/product-placeholder.svg',
      rental_fee: term[0],
      rental_days: cfg.days,
      return_amount: term[1],
      active: true,
      featured: index === 0,
      fallback: true
    })));
  }

  async function fetchProducts() {
    const fallback = fallbackProducts();
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !Array.isArray(data.products) || data.products.length < 20) return fallback;
      return data.products.map(product => ({ ...product, fallback: false }));
    } catch (_) {
      return fallback;
    }
  }

  function injectStyle() {
    if (document.getElementById('casharrowRentalCatalogStyle')) return;
    const style = document.createElement('style');
    style.id = 'casharrowRentalCatalogStyle';
    style.textContent = `
      #casharrowRentalCatalog{margin-top:24px}
      #casharrowRentalCatalog .rc-head{margin-bottom:13px}
      #casharrowRentalCatalog .rc-head h2{font-size:21px;color:#07162f;letter-spacing:-.3px}
      #casharrowRentalCatalog .rc-head p{font-size:11px;color:#718096;margin-top:4px}
      #casharrowRentalCatalog .rc-series{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
      #casharrowRentalCatalog .rc-series-btn{border:1px solid #dfe9f7;border-radius:17px;background:linear-gradient(145deg,#fff,#f2f7ff);padding:11px;text-align:left;color:#07162f;min-width:0;box-shadow:0 7px 18px rgba(17,45,88,.06)}
      #casharrowRentalCatalog .rc-series-btn.active{border-color:#1769ff;box-shadow:0 9px 22px rgba(7,87,232,.14)}
      #casharrowRentalCatalog .rc-badge{width:35px;height:35px;border-radius:11px;background:linear-gradient(135deg,#07162f,#1769ff);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;margin-bottom:8px}
      #casharrowRentalCatalog .rc-series-btn strong{display:block;font-size:13px}.rc-series-btn small{display:block;color:#718096;font-size:9px;margin-top:3px;line-height:1.35}.rc-days{display:block;color:#1769ff;font-weight:800;font-size:10px;margin-top:7px}
      #casharrowRentalCatalog .rc-panel{margin-top:11px}.rc-products{display:grid;gap:8px}
      #casharrowRentalCatalog .rc-product{display:grid;grid-template-columns:62px 1fr auto;align-items:center;gap:10px;background:#fff;border:1px solid #e5edf7;border-radius:16px;padding:8px;box-shadow:0 5px 15px rgba(17,45,88,.05)}
      #casharrowRentalCatalog .rc-product img{width:62px;height:52px;object-fit:cover;border-radius:11px;background:#07162f}.rc-info{min-width:0}.rc-info strong{display:block;font-size:13px}.rc-info small{display:block;color:#718096;font-size:9px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rc-meta{text-align:right}.rc-meta b{display:block;color:#1769ff;font-size:11px}.rc-meta small{display:block;color:#718096;font-size:9px;margin-top:3px}.rc-meta button{font-size:9px;padding:7px 9px;margin-top:5px}.rc-note{margin:0 0 9px;padding:10px;border-radius:12px;background:#f5f8fd;color:#60708a;font-size:10px;line-height:1.45}
      #casharrowRentalCatalog .rc-error{padding:10px;border-radius:12px;background:#fff4f4;color:#b42318;font-size:11px;margin-top:9px}
      #casharrowGuestHome,#casharrowDynamicMemberProducts{display:none!important}
      @media(max-width:520px){#casharrowRentalCatalog .rc-series{gap:6px}.rc-series-btn{padding:8px!important;border-radius:14px!important}.rc-badge{width:30px!important;height:30px!important;font-size:12px}.rc-series-btn strong{font-size:11px!important}.rc-series-btn small{font-size:8px!important}.rc-days{font-size:8px!important}.rc-product{grid-template-columns:52px 1fr auto!important;gap:7px!important}.rc-product img{width:52px!important;height:46px!important}.rc-info strong{font-size:11px!important}.rc-info small{font-size:8px!important}.rc-meta b{font-size:9px!important}.rc-meta small{font-size:8px!important}.rc-meta button{font-size:8px!important;padding:6px!important}}
    `;
    document.head.appendChild(style);
  }

  function removeLegacyCatalog() {
    document.getElementById('casharrowGuestHome')?.remove();
    document.getElementById('casharrowDynamicMemberProducts')?.remove();
    document.getElementById('casharrowMemberProducts')?.remove();
    document.querySelectorAll('.casharrow-products').forEach(el => el.remove());
  }

  async function rent(product, button) {
    const token = localStorage.getItem('casharrowToken');
    if (!token) {
      if (typeof window.openModal === 'function') window.openModal('login');
      else alert('Please log in to rent a product.');
      return;
    }
    if (!product.id) {
      alert('Rental products are loading from the server. Please refresh and try again.');
      return;
    }
    const ok = confirm(`Start ${product.code} rental?\n\nRental fee: ${money(product.rental_fee)}\nRental period: ${product.rental_days} days\nReturn credit: ${money(product.return_amount)}\n\nYour wallet will be charged only after you confirm.`);
    if (!ok) return;
    button.disabled = true;
    button.textContent = 'Starting...';
    try {
      const response = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: Number(product.id) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to start rental');
      alert(`Rental started successfully.\n\nCompletion date: ${new Date(data.endAt).toLocaleString()}`);
      button.textContent = 'Active';
      if (typeof window.loadWallet === 'function') await window.loadWallet();
      if (typeof window.cashArrowRefreshRentals === 'function') await window.cashArrowRefreshRentals();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = 'Rent';
    }
  }

  function render(products, host, openSeries) {
    const groups = { A: [], B: [], C: [], D: [] };
    products.forEach(product => {
      const series = String(product.series || product.code || '').charAt(0).toUpperCase();
      if (groups[series]) groups[series].push(product);
    });
    const open = openSeries && groups[openSeries]?.length ? openSeries : '';
    host.innerHTML = `<div class="rc-head"><h2>Rental Products</h2><p>Choose A, B, C or D to view the available CashArrow products.</p></div><div class="rc-series">${Object.entries(POLICY).map(([key,cfg]) => `<button type="button" class="rc-series-btn ${open===key?'active':''}" data-rc-series="${key}"><span class="rc-badge">${key}</span><strong>${key} Series</strong><small>${cfg.label}</small><span class="rc-days">${cfg.days} days · 5 products</span></button>`).join('')}</div>${open ? `<div class="rc-panel"><div class="rc-note"><strong>${open} Series</strong> · ${POLICY[open].days}-day rental period. Each product below shows its configured rental fee and return credit.</div><div class="rc-products">${groups[open].map(product => `<article class="rc-product"><img src="${esc(product.image_url || '/product-placeholder.svg')}" alt="${esc(product.code)}"><div class="rc-info"><strong>${esc(product.code)}</strong><small>${esc(product.name || `CashArrow Generator ${product.code}`)}</small></div><div class="rc-meta"><b>${money(product.rental_fee)}</b><small>${Number(product.rental_days)} days · return ${money(product.return_amount)}</small><button type="button" class="primary" data-rc-rent="${esc(product.code)}">${hasToken() && product.id ? 'Rent' : 'Login'}</button></div></article>`).join('')}</div></div>` : ''}`;

    host.querySelectorAll('[data-rc-series]').forEach(button => {
      button.addEventListener('click', () => render(products, host, button.dataset.rcSeries === open ? '' : button.dataset.rcSeries));
    });
    host.querySelectorAll('[data-rc-rent]').forEach(button => {
      const product = products.find(item => String(item.code) === button.dataset.rcRent);
      button.addEventListener('click', () => rent(product, button));
    });
  }

  async function init() {
    injectStyle();
    removeLegacyCatalog();
    const container = document.querySelector('main.container');
    if (!container) return;
    let host = document.getElementById('casharrowRentalCatalog');
    if (!host) {
      host = document.createElement('section');
      host.id = 'casharrowRentalCatalog';
      container.insertBefore(host, container.firstElementChild);
    }
    const fallback = fallbackProducts();
    render(fallback, host, '');
    const products = await fetchProducts();
    render(products, host, '');
    if (!products.length) host.insertAdjacentHTML('beforeend', '<div class="rc-error">Rental catalog could not be loaded. Please refresh the page.</div>');
    new MutationObserver(removeLegacyCatalog).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
