(() => {
  if (window.__aveilotMachineBranding) return;
  window.__aveilotMachineBranding = true;

  const seriesFrom = (node) => {
    const text = (node.textContent || '').toUpperCase();
    const m = text.match(/\b([ABCD])(?:\s*[- ]?\s*\d+)?\b/);
    return m ? m[1] : 'A';
  };

  const assetFor = (series) => `/machine-${String(series).toLowerCase()}.svg?v=aveilot1`;

  const style = document.createElement('style');
  style.textContent = `
    .aveilot-machine-visual{position:relative;width:100%;min-height:170px;border-radius:18px;overflow:hidden;background:#eef2f6;box-shadow:inset 0 0 0 1px rgba(7,87,232,.12)}
    .aveilot-machine-visual img{display:block!important;width:100%!important;height:auto!important;min-height:170px;object-fit:cover!important;border-radius:18px!important;background:#eef2f6!important}
    .aveilot-machine-brand{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:11px;background:rgba(3,20,47,.93);color:#fff;box-shadow:0 5px 16px rgba(0,0,0,.22);pointer-events:none}
    .aveilot-machine-brand strong{font-size:14px;font-weight:950;letter-spacing:.4px}
    .aveilot-machine-brand span{font-size:9px;font-weight:800;letter-spacing:.7px;color:#bcd8ff;text-transform:uppercase;text-align:right}
    .ca-product{align-items:stretch!important}
    @media(max-width:560px){.aveilot-machine-visual{min-height:150px}.aveilot-machine-visual img{min-height:150px}.aveilot-machine-brand{left:7px;right:7px;bottom:7px;padding:7px 8px}.aveilot-machine-brand strong{font-size:12px}.aveilot-machine-brand span{font-size:8px}}
  `;
  document.head.appendChild(style);

  function brandCard(card) {
    if (!card || card.dataset.aveilotBranded === '1') return;
    const img = card.querySelector('img');
    if (!img) return;
    const series = seriesFrom(card);
    const wrapper = document.createElement('div');
    wrapper.className = 'aveilot-machine-visual';
    const fresh = document.createElement('img');
    fresh.src = assetFor(series);
    fresh.alt = `AVEILOT ${series} Series PowerGen Rentals machine`;
    fresh.loading = 'lazy';
    const plaque = document.createElement('div');
    plaque.className = 'aveilot-machine-brand';
    plaque.innerHTML = `<strong>🏹 AVEILOT</strong><span>POWERGEN RENTALS · ${series} SERIES</span>`;
    wrapper.append(fresh, plaque);
    img.replaceWith(wrapper);
    card.dataset.aveilotBranded = '1';
  }

  function scan(root = document) {
    root.querySelectorAll?.('.ca-product').forEach(brandCard);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('.ca-product')) brandCard(node);
        scan(node);
      });
    }
  });

  function start() {
    scan();
    observer.observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
