(() => {
  if (window.__aveilotMachineCatalogFix) return;
  window.__aveilotMachineCatalogFix = true;

  // Branding-only layer. Machine imagery is handled by aveilot-real-machine-photos.js.
  // Deliberately no SVG fallback here: AVEILOT should never show the old illustrated machines.
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
      const title = card.querySelector('h3');
      if (title) title.textContent = `${code} · AVEILOT PowerGen Machine`;
      const desc = card.querySelector('p');
      if (desc) desc.textContent = `${code.charAt(0)} Series · AVEILOT PowerGen rental machine ${code}.`;
    });

    const heading = root.querySelector?.('.ca-rental-head h2');
    if (heading) heading.textContent = 'AVEILOT PowerGen Rentals';
    const sub = root.querySelector?.('.ca-rental-head p');
    if (sub) sub.textContent = 'Premium PowerGen machines — each model has its own visual identity.';
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
