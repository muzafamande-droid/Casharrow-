(() => {
  if (window.__aveilotRealMachinePhotos) return;
  window.__aveilotRealMachinePhotos = true;

  // Twenty different machine photographs. No product code reuses the same source image.
  // These are temporary visual references while the dedicated AVEILOT AI render set is prepared.
  const FILES = [
    '2012 09 07 2012 09 07 Dieselgeneratoren DSCI9222.JPG',
    '20150724 libramont026.JPG',
    '2019 06 14 Polar Ecuador 1800U Dieselgen Hansa IMG 6425.JPG',
    '2019-10-03 - TDE - Dieselgenerator.jpg',
    '26HP dizel jeneratör.jpg',
    'Agregat SW266.53..JPG',
    'Airport of Patos de Minas, Brazil, Minas Gerais, Gerador de energia (2).jpg',
    'Aurora Diesel Generator.png',
    'BRS 40 kVA generator.jpg',
    'Caterpillar (Olympian) Generator Set.jpg',
    'CaterpillarGen.jpg',
    'Cumminspower.jpg',
    'Deutz F6L912 diesel generator.jpg',
    'Diesel generator 001.jpg',
    'Diesel generator MMZ.jpg',
    'Diesel power backup generator.jpg',
    'Diesel Set.jpg',
    'Dieselgenerátor.jpg',
    'Dizel generator. Toshkent.jpg',
    'ICC Silent Generator.jpg'
  ];

  const URL = name => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(name)}`;
  const PHOTOS = FILES.map(URL);

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
      badge.textContent = `🏹 AVEILOT · ${code}`;
      box.appendChild(badge);
    }
  }

  function style() {
    if (document.getElementById('aveilotPremiumPhotoStyle')) return;
    const s = document.createElement('style');
    s.id = 'aveilotPremiumPhotoStyle';
    s.textContent = `
      .aveilot-photo-stage{position:relative!important;overflow:hidden!important;background:#0a1220!important;isolation:isolate;box-shadow:inset 0 0 0 1px rgba(255,255,255,.10),0 12px 30px rgba(4,16,35,.14)}
      .aveilot-photo-stage:before{content:'';position:absolute;inset:-20%;z-index:1;pointer-events:none;background:radial-gradient(circle at 18% 18%,rgba(255,255,255,.28),transparent 28%),linear-gradient(125deg,transparent 42%,rgba(255,255,255,.12) 50%,transparent 58%);mix-blend-mode:screen;transform:translateX(-18%);animation:aveilotLightSweep 8s ease-in-out infinite}
      .aveilot-photo-stage:after{content:'POWERGEN';position:absolute;right:10px;top:10px;z-index:2;color:rgba(255,255,255,.72);font:900 9px/1 Arial,sans-serif;letter-spacing:2px;padding:6px 7px;border:1px solid rgba(255,255,255,.18);border-radius:7px;background:rgba(3,13,28,.35);backdrop-filter:blur(5px);pointer-events:none}
      .aveilot-photo-stage img{position:relative;z-index:0;width:100%;height:100%;object-fit:cover;filter:contrast(1.06) saturate(1.08);transition:transform .35s ease,filter .35s ease}
      .aveilot-photo-stage:hover img{transform:scale(1.035);filter:contrast(1.1) saturate(1.12) brightness(1.03)}
      .aveilot-real-badge{position:absolute;left:10px;bottom:10px;z-index:3;background:rgba(7,87,232,.94);color:#fff;border-radius:9px;padding:7px 10px;font:900 11px/1 Arial,sans-serif;letter-spacing:.25px;box-shadow:0 4px 14px rgba(0,0,0,.3);pointer-events:none}
      .aveilot-photo-a1,.aveilot-photo-a2,.aveilot-photo-a3,.aveilot-photo-a4,.aveilot-photo-a5{background:linear-gradient(145deg,#17253b,#07101e)!important}
      .aveilot-photo-b1,.aveilot-photo-b2,.aveilot-photo-b3,.aveilot-photo-b4,.aveilot-photo-b5{background:linear-gradient(145deg,#20262e,#090d13)!important}
      .aveilot-photo-c1,.aveilot-photo-c2,.aveilot-photo-c3,.aveilot-photo-c4,.aveilot-photo-c5{background:linear-gradient(145deg,#182d2b,#071312)!important}
      .aveilot-photo-d1,.aveilot-photo-d2,.aveilot-photo-d3,.aveilot-photo-d4,.aveilot-photo-d5{background:linear-gradient(145deg,#29231a,#0e0b07)!important}
      @keyframes aveilotLightSweep{0%,100%{opacity:.18;transform:translateX(-22%) rotate(-3deg)}50%{opacity:.42;transform:translateX(22%) rotate(3deg)}}
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
