(() => {
  if (window.__aveilotRealMachinePhotos) return;
  window.__aveilotRealMachinePhotos = true;

  // AVEILOT machine visuals: futuristic power rooms, reactor cores and industrial energy systems.
  // Sources are free-use StockCake images; the page uses them as visual references for the rental catalog.
  const FILES = [
    'https://images.stockcake.com/public/1/e/6/1e616c57-f289-4d10-9ab9-1bb75b6d4a26_large/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/a/7/1a734b73-4db1-42d2-b8b6-a92d8e9341d2_small/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/3/b/7/3b7f88ed-1421-4505-8431-f0f959a371ab_small/futuristic-mechanical-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/2/8/128c7c7a-8e4a-41f8-a249-3b0c4d726169_small/futuristic-power-source-stockcake.jpg',
    'https://images.stockcake.com/public/8/d/f/8df1d8b9-0a4c-4509-931d-775a403a5f38_small/mechanical-core-illuminated-stockcake.jpg',
    'https://images.stockcake.com/public/1/e/6/1e616c57-f289-4d10-9ab9-1bb75b6d4a26_large/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/a/7/1a734b73-4db1-42d2-b8b6-a92d8e9341d2_small/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/3/b/7/3b7f88ed-1421-4505-8431-f0f959a371ab_small/futuristic-mechanical-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/2/8/128c7c7a-8e4a-41f8-a249-3b0c4d726169_small/futuristic-power-source-stockcake.jpg',
    'https://images.stockcake.com/public/8/d/f/8df1d8b9-0a4c-4509-931d-775a403a5f38_small/mechanical-core-illuminated-stockcake.jpg',
    'https://images.stockcake.com/public/1/e/6/1e616c57-f289-4d10-9ab9-1bb75b6d4a26_large/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/a/7/1a734b73-4db1-42d2-b8b6-a92d8e9341d2_small/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/3/b/7/3b7f88ed-1421-4505-8431-f0f959a371ab_small/futuristic-mechanical-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/2/8/128c7c7a-8e4a-41f8-a249-3b0c4d726169_small/futuristic-power-source-stockcake.jpg',
    'https://images.stockcake.com/public/8/d/f/8df1d8b9-0a4c-4509-931d-775a403a5f38_small/mechanical-core-illuminated-stockcake.jpg',
    'https://images.stockcake.com/public/1/e/6/1e616c57-f289-4d10-9ab9-1bb75b6d4a26_large/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/a/7/1a734b73-4db1-42d2-b8b6-a92d8e9341d2_small/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/3/b/7/3b7f88ed-1421-4505-8431-f0f959a371ab_small/futuristic-mechanical-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/2/8/128c7c7a-8e4a-41f8-a249-3b0c4d726169_small/futuristic-power-source-stockcake.jpg',
    'https://images.stockcake.com/public/8/d/f/8df1d8b9-0a4c-4509-931d-775a403a5f38_small/mechanical-core-illuminated-stockcake.jpg'
  ];

  const PHOTOS = FILES;

  function codeFor(img) {
    const card = img.closest('.ca-product');
    const code = card?.querySelector('h3')?.textContent?.trim().match(/\b([ABCD][1-5])\b/i)?.[1]?.toUpperCase() || '';
    if (code) return code;
    const modal = img.closest('.ca-modal-card');
    return modal?.querySelector('.ca-modal-top h3')?.textContent?.match(/\b([ABCD][1-5])\b/i)?.[1]?.toUpperCase() || '';
  }

  function photoFor(code) {
    const series = Math.max(0, code.charCodeAt(0) - 65);
    const number = Math.max(1, parseInt(code.slice(1), 10) || 1);
    return PHOTOS[series * 5 + number - 1];
  }

  function addPremiumTreatment(box, code) {
    if (!box) return;
    box.classList.add('aveilot-photo-stage', `aveilot-photo-${code.toLowerCase()}`);
    if (!box.querySelector('.aveilot-real-badge')) {
      const badge = document.createElement('div');
      badge.className = 'aveilot-real-badge';
      badge.textContent = `AVEILOT · ${code}`;
      box.appendChild(badge);
    }
  }

  function style() {
    if (document.getElementById('aveilotPremiumPhotoStyle')) return;
    const s = document.createElement('style');
    s.id = 'aveilotPremiumPhotoStyle';
    s.textContent = `
      .aveilot-photo-stage{position:relative!important;overflow:hidden!important;background:#050816!important;isolation:isolate;box-shadow:inset 0 0 0 1px rgba(75,180,255,.28),0 12px 30px rgba(0,90,220,.28)}
      .aveilot-photo-stage:before{content:'';position:absolute;inset:-25%;z-index:1;pointer-events:none;background:radial-gradient(circle at 20% 20%,rgba(75,190,255,.32),transparent 24%),linear-gradient(125deg,transparent 38%,rgba(80,200,255,.14) 48%,transparent 56%);mix-blend-mode:screen;transform:translateX(-18%);animation:aveilotLightSweep 7s ease-in-out infinite}
      .aveilot-photo-stage:after{content:'AVEILOT';position:absolute;right:10px;top:10px;z-index:2;color:#fff;font:900 10px/1 Arial,sans-serif;letter-spacing:2px;padding:7px 8px;border:1px solid rgba(100,210,255,.65);border-radius:7px;background:rgba(3,17,45,.72);box-shadow:0 0 16px rgba(60,190,255,.28);pointer-events:none}
      .aveilot-photo-stage img{position:relative;z-index:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.08) contrast(1.08) brightness(.90);transition:transform .35s ease,filter .35s ease}
      .aveilot-photo-stage:hover img{transform:scale(1.035);filter:saturate(1.15) contrast(1.12) brightness(.98)}
      .aveilot-photo-a1 img,.aveilot-photo-b1 img,.aveilot-photo-c1 img,.aveilot-photo-d1 img{object-position:center}
      .aveilot-photo-a2 img,.aveilot-photo-b2 img,.aveilot-photo-c2 img,.aveilot-photo-d2 img{object-position:35% center}
      .aveilot-photo-a3 img,.aveilot-photo-b3 img,.aveilot-photo-c3 img,.aveilot-photo-d3 img{object-position:65% center}
      .aveilot-photo-a4 img,.aveilot-photo-b4 img,.aveilot-photo-c4 img,.aveilot-photo-d4 img{object-position:top center}
      .aveilot-photo-a5 img,.aveilot-photo-b5 img,.aveilot-photo-c5 img,.aveilot-photo-d5 img{object-position:bottom center}
      .aveilot-real-badge{position:absolute;left:10px;bottom:10px;z-index:3;background:rgba(3,17,45,.86);color:#fff;border:1px solid rgba(100,210,255,.55);border-radius:9px;padding:7px 10px;font:900 11px/1 Arial,sans-serif;letter-spacing:.35px;box-shadow:0 0 16px rgba(60,190,255,.20);pointer-events:none}
      @keyframes aveilotLightSweep{0%,100%{opacity:.20;transform:translateX(-24%) rotate(-3deg)}50%{opacity:.48;transform:translateX(24%) rotate(3deg)}}
      @media(prefers-reduced-motion:reduce){.aveilot-photo-stage:before{animation:none}}
    `;
    document.head.appendChild(s);
  }

  function swap(root = document) {
    style();
    root.querySelectorAll?.('.ca-product-photo img,.ca-detail-photo img').forEach(img => {
      const code = codeFor(img);
      if (!code) return;
      const wanted = photoFor(code);
      if (img.dataset.aveilotRealPhoto !== wanted) {
        img.dataset.aveilotRealPhoto = wanted;
        img.src = wanted;
        img.referrerPolicy = 'no-referrer';
        img.loading = 'lazy';
        img.removeAttribute('onerror');
      }
      addPremiumTreatment(img.parentElement, code);
    });
  }

  function start() {
    swap();
    if (window.__aveilotRealPhotoObserver) return;
    const observer = new MutationObserver(() => swap());
    window.__aveilotRealPhotoObserver = observer;
    observer.observe(document.body, {subtree:true, childList:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
