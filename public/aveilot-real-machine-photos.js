(() => {
  if (window.__aveilotRealMachinePhotos) return;
  window.__aveilotRealMachinePhotos = true;

  // Restored AVEILOT futuristic power-core visuals from the earlier catalog.
  // The same sci-fi image family is assigned consistently across A1-D5.
  const FILES = [
    'https://images.pexels.com/photos/18816918/pexels-photo-18816918.jpeg?cs=srgb&dl=pexels-igovar-igovar-3000547-18816918.jpg&fm=jpg',
    'https://images.pexels.com/photos/35042792/pexels-photo-35042792.jpeg?cs=srgb&dl=pexels-theshuttervision-35042792.jpg&fm=jpg',
    'https://images.pexels.com/photos/5693845/pexels-photo-5693845.jpeg?cs=srgb&dl=pexels-ezrah-lane-3654374-5693845.jpg&fm=jpg',
    'https://images.pexels.com/photos/20091612/pexels-photo-20091612.jpeg?cs=srgb&dl=pexels-richard-wilson-779692900-20091612.jpg&fm=jpg',
    'https://images.stockcake.com/public/c/2/1/c21e252f-6a70-454d-8130-124d2be845d0_large/colossal-turbine-engine-stockcake.jpg',
    'https://images.stockcake.com/public/c/7/c/c7c13a81-5dc1-4cc3-8e33-012430c7007b_large/dynamic-industrial-turbine-stockcake.jpg',
    'https://images.stockcake.com/public/e/b/4/eb453184-925f-4963-b8eb-ad9d2bcabee5_large/green-energy-machine-stockcake.jpg',
    'https://images.stockcake.com/public/2/c/2/2c277ee3-8151-450a-8c5b-6685ab084196_large/industrial-turbine-assembly-stockcake.jpg'
  ];

  const CODE_TO_PHOTO = {
    A1:0,A2:1,A3:2,A4:3,A5:4,
    B1:5,B2:6,B3:7,B4:2,B5:0,
    C1:3,C2:5,C3:1,C4:6,C5:4,
    D1:7,D2:2,D3:5,D4:0,D5:3
  };

  function codeFor(img) {
    const card = img.closest('.ca-product');
    const code = card?.querySelector('h3')?.textContent?.trim().match(/\b([ABCD][1-5])\b/i)?.[1]?.toUpperCase() || '';
    if (code) return code;
    const modal = img.closest('.ca-modal-card');
    return modal?.querySelector('.ca-modal-top h3')?.textContent?.match(/\b([ABCD][1-5])\b/i)?.[1]?.toUpperCase() || '';
  }

  function photoFor(code) {
    const c = String(code || '').toUpperCase().match(/\b([ABCD][1-5])\b/)?.[1] || 'A1';
    return FILES[CODE_TO_PHOTO[c] ?? 0];
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

      /* D-series only: distinct machine-scale/crop treatments. */
      .aveilot-photo-d1 img{transform:scale(1.16);object-position:center 54%;filter:saturate(1.10) contrast(1.10) brightness(.88)}
      .aveilot-photo-d2 img{transform:scale(1.30);object-position:31% 47%;filter:saturate(1.14) contrast(1.12) brightness(.86)}
      .aveilot-photo-d3 img{transform:scale(1.08);object-position:69% 58%;filter:saturate(1.06) contrast(1.14) brightness(.90)}
      .aveilot-photo-d4 img{transform:scale(1.38);object-position:54% 30%;filter:saturate(1.12) contrast(1.15) brightness(.84)}
      .aveilot-photo-d5 img{transform:scale(1.22);object-position:43% 73%;filter:saturate(1.16) contrast(1.10) brightness(.89)}
      .aveilot-photo-d1:before{background:radial-gradient(circle at 72% 22%,rgba(70,190,255,.34),transparent 27%),linear-gradient(110deg,transparent 35%,rgba(80,200,255,.13) 49%,transparent 62%)}
      .aveilot-photo-d2:before{background:radial-gradient(circle at 25% 70%,rgba(75,190,255,.35),transparent 25%),linear-gradient(145deg,transparent 36%,rgba(80,200,255,.14) 50%,transparent 64%)}
      .aveilot-photo-d3:before{background:radial-gradient(circle at 80% 45%,rgba(70,190,255,.30),transparent 25%),linear-gradient(120deg,transparent 42%,rgba(80,200,255,.16) 51%,transparent 59%)}
      .aveilot-photo-d4:before{background:radial-gradient(circle at 45% 18%,rgba(75,190,255,.36),transparent 23%),linear-gradient(160deg,transparent 32%,rgba(80,200,255,.15) 49%,transparent 65%)}
      .aveilot-photo-d5:before{background:radial-gradient(circle at 20% 82%,rgba(75,190,255,.34),transparent 24%),linear-gradient(100deg,transparent 40%,rgba(80,200,255,.14) 52%,transparent 63%)}
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
