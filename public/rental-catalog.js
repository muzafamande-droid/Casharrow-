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
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function fallbackProducts() {
    return Object.entries(POLICY).flatMap(([series, cfg]) => cfg.products.map((term, index) => ({
      id: null, series, code: `${series}${index + 1}`,
      name: `CashArrow Generator ${series}${index + 1}`,
      description: `${series} Series rental product`,
      image_url: '/product-placeholder.svg', rental_fee: term[0], rental_days: cfg.days,
      return_amount: term[1], active: true, featured: index === 0, fallback: true
    })));
  }

  async function fetchProducts() {
    const fallback = fallbackProducts();
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      const products = Array.isArray(data.products) ? data.products : [];
      if (products.length >= 20) return products;
    } catch (_) {}
    return fallback;
  }

  function grouped(products) {
    return Object.fromEntries(Object.keys(POLICY).map(series => [series, products.filter(p => String(p.code || '').toUpperCase().startsWith(series))]));
  }

  function mount() {
    const container = document.querySelector('main.container');
    if (!container) return false;

    document.getElementById('casharrowRentalCatalog')?.remove();
    document.getElementById('casharrowGuestHome')?.remove();
    document.getElementById('casharrowDynamicMemberProducts')?.remove();
    document.getElementById('casharrowMemberProducts')?.remove();

    const section = document.createElement('section');
    section.id = 'casharrowRentalCatalog';
    section.className = 'ca-rental-catalog';
    section.innerHTML = `<div class="ca-rental-head"><div><h2>Rental Products</h2><p>Choose a CashArrow series and select a product.</p></div></div><div class="ca-series-tabs"></div><div class="ca-series-products"></div>`;

    const style = document.createElement('style');
    style.id = 'casharrowRentalCatalogStyle';
    style.textContent = `.ca-rental-catalog{margin-top:24px}.ca-rental-head{margin-bottom:12px}.ca-rental-head h2{font-size:20px}.ca-rental-head p{color:#7b8494;font-size:13px;margin-top:4px}.ca-series-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ca-series-tab{background:#fff;border:1px solid #dce7f8;color:#0757e8;border-radius:14px;padding:13px 8px;text-align:center;font-weight:800;box-shadow:0 3px 12px rgba(0,0,0,.04)}.ca-series-tab small{display:block;color:#7b8494;font-weight:600;margin-top:3px}.ca-series-tab.active{background:#0757e8;color:#fff}.ca-series-tab.active small{color:#dceaff}.ca-series-products{margin-top:10px}.ca-series-panel{display:none;background:#fff;border-radius:16px;padding:12px;box-shadow:0 4px 15px rgba(0,0,0,.06)}.ca-series-panel.active{display:block}.ca-product{display:grid;grid-template-columns:46px 1fr auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid #edf1f6}.ca-product:last-child{border-bottom:0}.ca-product img{width:46px;height:46px;border-radius:10px;object-fit:cover;background:#eef5ff}.ca-product h3{font-size:14px}.ca-product p{font-size:12px;color:#7b8494;margin-top:3px;line-height:1.35}.ca-product button{padding:9px 11px;background:#0757e8;color:#fff;border-radius:10px;font-size:12px}.ca-product button:disabled{background:#cbd5e1}.ca-note{font-size:12px;color:#7b8494;margin:4px 0 8px}@media(max-width:480px){.ca-series-tabs{grid-template-columns:repeat(2,1fr)}.ca-product{grid-template-columns:40px 1fr}.ca-product img{width:40px;height:40px}.ca-product button{grid-column:2;width:max-content}.ca-product{align-items:start}}`;
    document.head.appendChild(style);
    container.appendChild(section);

    let products = fallbackProducts();
    let groups = grouped(products);
    let openSeries = 'A';

    function render() {
      const tabs = section.querySelector('.ca-series-tabs');
      const panels = section.querySelector('.ca-series-products');
      tabs.innerHTML = '';
      panels.innerHTML = '';
      Object.entries(POLICY).forEach(([series, cfg]) => {
        const list = groups[series] || [];
        const tab = document.createElement('button');
        tab.className = `ca-series-tab${openSeries === series ? ' active' : ''}`;
        tab.innerHTML = `${series} Series<small>${cfg.days} days · ${list.length || 5} products</small>`;
        tab.onclick = () => { openSeries = series; render(); };
        tabs.appendChild(tab);

        const panel = document.createElement('div');
        panel.className = `ca-series-panel${openSeries === series ? ' active' : ''}`;
        panel.innerHTML = `<div class="ca-note">${esc(cfg.label)} · ${cfg.days}-day rental period</div>`;
        list.forEach((p, index) => {
          const fallbackTerm = cfg.products[index] || [0, 0];
          const fee = Number(p.rental_fee) || fallbackTerm[0];
          const ret = Number(p.return_amount) || fallbackTerm[1];
          const days = Number(p.rental_days) || cfg.days;
          const hasId = p.id !== null && p.id !== undefined && p.id !== '';
          const row = document.createElement('div');
          row.className = 'ca-product';
          row.innerHTML = `<img src="${esc(p.image_url || '/product-placeholder.svg')}" onerror="this.src='/product-placeholder.svg'"><div><h3>${esc(p.code || `${series}${index+1}`)}</h3><p>Rental: ${money(fee)} · Return credit: ${money(ret)} · ${days} days</p></div>`;
          const button = document.createElement('button');
          button.textContent = hasId && hasToken() ? 'Rent' : 'Login';
          button.onclick = () => {
            if (!hasToken()) {
              if (typeof window.openModal === 'function') window.openModal('login');
              else alert('Please login to rent this product.');
              return;
            }
            if (!hasId) { alert('Rental products are loading. Please try again shortly.'); return; }
            if (!confirm(`Rent ${p.code}?\n\nFee: ${money(fee)}\nPeriod: ${days} days\nReturn credit: ${money(ret)}`)) return;
            button.disabled = true;
            fetch('/api/rentals', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('casharrowToken')}`}, body:JSON.stringify({productId:p.id}) })
              .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || 'Rental failed'); return d; })
              .then(d => { alert(d.message || 'Rental started successfully.'); if (typeof window.loadWallet === 'function') window.loadWallet(); if (typeof window.cashArrowRefreshRentals === 'function') window.cashArrowRefreshRentals(); })
              .catch(e => alert(e.message || 'Unable to start rental.'))
              .finally(() => { button.disabled = false; });
          };
          row.appendChild(button);
          panel.appendChild(row);
        });
        panels.appendChild(panel);
      });
    }

    render();
    fetchProducts().then(realProducts => {
      if (realProducts.length >= 20) { products = realProducts; groups = grouped(products); render(); }
    });
    return true;
  }

  function start() {
    if (mount()) return;
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
