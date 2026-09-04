(() => {
  if (window.__aveilotRealMachinePhotos) return;
  window.__aveilotRealMachinePhotos = true;

  // Twenty different machine photographs. No product code reuses the same source image.
  // These remain temporary visual references while the dedicated AVEILOT AI render set is prepared.
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
      badge.textContent = `AVEILOT · ${code}`;
      box.appendChild(badge);
    }
  }

  function style() {
    if (document.getElementById('aveilotPremiumPhotoStyle')) return;
    const s = document.createElement('style');
    s.id = 'aveilotPremiumPhotoStyle';
    s.textContent = `
      .aveilot-photo-stage{position:relative!important;overflow:hidden!important;background:#0757e8!important;isolation:isolate;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 12px 30px rgba(7,87,232,.22)}
      .aveilot-photo-stage:before{content:'';position:absolute;inset:-25%;z-index:1;pointer-events:none;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.50),transparent 24%),linear-gradient(125deg,transparent 38%,rgba(255,255,255,.22) 48%,transparent 56%);mix-blend-mode:screen;transform:translateX(-18%);animation:aveilotLightSweep 7s ease-in-out infinite}
      .aveilot-photo-stage:after{content:'AVEILOT';position:absolute;right:10px;top:10px;z-index:2;color:#fff;font:900 10px/1 Arial,sans-serif;letter-spacing:2px;padding:7px 8px;border:1px solid rgba(255,255,255,.65);border-radius:7px;background:rgba(7,87,232,.72);box-shadow:0 0 16px rgba(255,255,255,.28);pointer-events:none}
      .aveilot-photo-stage img{position:relative;z-index:0;width:100%;height:100%;object-fit:cover;filter:saturate(.82) hue-rotate(178deg) contrast(1.10) brightness(.98);transition:transform .35s ease,filter .35s ease}
      .aveilot-photo-stage:hover img{transform:scale(1.035);filter:saturate(.95) hue-rotate(178deg) contrast(1.14) brightness(1.03)}
      .aveilot-real-badge{position:absolute;left:10px;bottom:10px;z-index:3;background:#0757e8;color:#fff;border-radius:9px;padding:7px 10px;font:900 11px/1 Arial,sans-serif;letter-spacing:.35px;box-shadow:0 0 16px rgba(255,255,255,.20);pointer-events:none}
      .aveilot-photo-stage:global{}
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
