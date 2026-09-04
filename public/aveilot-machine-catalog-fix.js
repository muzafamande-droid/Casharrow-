(() => {
  if (window.__aveilotMachineCatalogFix) return;
  window.__aveilotMachineCatalogFix = true;

  const assets = { A:'/machine-a.svg', B:'/machine-b.svg', C:'/machine-c.svg', D:'/machine-d.svg' };
  const variants = {
    A1:'v1', A2:'v2', A3:'v3', A4:'v4', A5:'v5',
    B1:'v6', B2:'v7', B3:'v8', B4:'v9', B5:'v10',
    C1:'v11', C2:'v12', C3:'v13', C4:'v14', C5:'v15',
    D1:'v16', D2:'v17', D3:'v18', D4:'v19', D5:'v20'
  };

  function style() {
    if (document.getElementById('aveilotMachineCatalogFixStyle')) return;
    const s = document.createElement('style');
    s.id = 'aveilotMachineCatalogFixStyle';
    s.textContent = `
      .ca-product{position:relative}
      .ca-product-photo{position:relative!important;background:linear-gradient(145deg,#eef3f8,#dfe7f0)!important;box-shadow:inset 0 0 0 1px rgba(7,22,47,.05)}
      .ca-product-photo:after{content:'AVEILOT  ·  POWERGEN RENTALS';position:absolute;left:9px;bottom:8px;background:rgba(7,22,47,.9);color:#fff;border-radius:7px;padding:5px 7px;font-size:8px;font-weight:900;letter-spacing:.7px;pointer-events:none}
      .ca-product-photo img{transition:transform .2s ease,filter .2s ease;transform-origin:center}
      .ca-product[data-variant='v1'] .ca-product-photo img{transform:scale(1.00)}
      .ca-product[data-variant='v2'] .ca-product-photo img{transform:scale(1.08) translateX(-3%);filter:contrast(1.08)}
      .ca-product[data-variant='v3'] .ca-product-photo img{transform:scale(1.16) translateX(4%);filter:saturate(.85) contrast(1.12)}
      .ca-product[data-variant='v4'] .ca-product-photo img{transform:scale(1.03) translateY(-5%);filter:brightness(.94) contrast(1.14)}
      .ca-product[data-variant='v5'] .ca-product-photo img{transform:scale(1.20) translateY(3%);filter:saturate(1.12)}
      .ca-product[data-variant='v6'] .ca-product-photo img{transform:scale(1.02) rotate(-1deg)}
      .ca-product[data-variant='v7'] .ca-product-photo img{transform:scale(1.10) rotate(1deg);filter:contrast(1.06)}
      .ca-product[data-variant='v8'] .ca-product-photo img{transform:scale(1.18) translateX(-5%);filter:brightness(.92) saturate(.9)}
      .ca-product[data-variant='v9'] .ca-product-photo img{transform:scale(1.06) translateY(-7%);filter:contrast(1.15)}
      .ca-product[data-variant='v10'] .ca-product-photo img{transform:scale(1.23) translateX(5%);filter:saturate(1.15) contrast(1.05)}
      .ca-product[data-variant='v11'] .ca-product-photo img{transform:scale(1.00) translateY(2%)}
      .ca-product[data-variant='v12'] .ca-product-photo img{transform:scale(1.09) translateX(-4%);filter:brightness(.96)}
      .ca-product[data-variant='v13'] .ca-product-photo img{transform:scale(1.17) translateX(3%);filter:contrast(1.12) saturate(.88)}
      .ca-product[data-variant='v14'] .ca-product-photo img{transform:scale(1.05) translateY(-6%);filter:brightness(.9) contrast(1.16)}
      .ca-product[data-variant='v15'] .ca-product-photo img{transform:scale(1.25) translateY(4%);filter:saturate(1.18)}
      .ca-product[data-variant='v16'] .ca-product-photo img{transform:scale(1.03) rotate(-1.5deg);filter:contrast(1.05)}
      .ca-product[data-variant='v17'] .ca-product-photo img{transform:scale(1.12) rotate(1.5deg);filter:brightness(.95) contrast(1.1)}
      .ca-product[data-variant='v18'] .ca-product-photo img{transform:scale(1.19) translateX(-4%);filter:saturate(.82) contrast(1.14)}
      .ca-product[data-variant='v19'] .ca-product-photo img{transform:scale(1.07) translateY(-8%);filter:brightness(.91) contrast(1.17)}
      .ca-product[data-variant='v20'] .ca-product-photo img{transform:scale(1.28) translateX(4%);filter:saturate(1.2) contrast(1.06)}
      .ca-product h3,.ca-product p{font-family:Arial,sans-serif}
      .ca-product h3:after{content:'  •  AVEILOT';font-size:.55em;color:#0757e8;letter-spacing:.4px;vertical-align:middle}
      .ca-rental-head h2:before{content:'🏭 ';}
    `;
    document.head.appendChild(s);
  }

  function fix(root=document.body) {
    style();
    const cards = root.querySelectorAll?.('.ca-product') || [];
    cards.forEach(card => {
      const code = String(card.querySelector('h3')?.textContent || '').match(/\b([ABCD][1-5])\b/i)?.[1]?.toUpperCase();
      if (!code) return;
      card.dataset.variant = variants[code] || 'v1';
      const img = card.querySelector('.ca-product-photo img');
      const series = code.charAt(0);
      if (img && assets[series] && (!img.src || /product-placeholder|machine-[abcd]\.svg/.test(img.src))) {
        img.src = `${assets[series]}?v=aveilot-${code.toLowerCase()}`;
        img.alt = `AVEILOT ${code} PowerGen rental machine`;
      }
      const title = card.querySelector('h3');
      if (title) title.textContent = `${code} · AVEILOT PowerGen Machine`;
      const desc = card.querySelector('p');
      if (desc) desc.textContent = `${series} Series · AVEILOT PowerGen rental machine ${code}.`;
    });

    const heading = root.querySelector?.('.ca-rental-head h2');
    if (heading) heading.textContent = 'AVEILOT PowerGen Rentals';
    const sub = root.querySelector?.('.ca-rental-head p');
    if (sub) sub.textContent = 'Choose a series and select an AVEILOT PowerGen machine.';
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fix(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once:true });
  else schedule();

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
