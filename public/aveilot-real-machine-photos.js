(() => {
  if (window.__aveilotRealMachinePhotos) return;
  window.__aveilotRealMachinePhotos = true;

  // Real machine photographs from Wikimedia Commons, selected as product-photo references.
  // The catalog uses these instead of the old illustrated SVG assets.
  const PHOTOS = [
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Small_diesel-generator.jpg',
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mobile_electric_generator.jpg',
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Diesel_Set.jpg',
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/KOEL_Green_-_Diesel_Generator_Set_-_Kolkata_2018-01-17_7592.JPG',
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Kirloskar_-_Silent_Diesel_Generator_Set_-_Kolkata_2017-12-12_6083.JPG',
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Enclosed_Caterpillar_C15_Generator_Set.JPG',
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Caterpillar_%28Olympian%29_Generator_Set.jpg',
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Dieselgenerator.jpg'
  ];

  function codeFor(img) {
    const card = img.closest('.ca-product');
    const code = card?.querySelector('h3')?.textContent?.trim().toUpperCase() || '';
    if (/^[ABCD][0-9]+$/.test(code)) return code;
    const modal = img.closest('.ca-modal-card');
    const modalCode = modal?.querySelector('.ca-modal-top h3')?.textContent?.match(/\b([ABCD][0-9]+)\b/i)?.[1]?.toUpperCase();
    return modalCode || '';
  }

  function photoFor(code) {
    const series = code.charCodeAt(0) - 65;
    const number = Math.max(1, parseInt(code.slice(1), 10) || 1);
    const index = (series * 5 + number - 1) % PHOTOS.length;
    return PHOTOS[index];
  }

  function addBadge(box, code) {
    if (!box || box.querySelector('.aveilot-real-badge')) return;
    box.style.position = 'relative';
    const badge = document.createElement('div');
    badge.className = 'aveilot-real-badge';
    badge.textContent = `🏹 AVEILOT · ${code || 'POWERGEN'}`;
    badge.style.cssText = 'position:absolute;left:10px;bottom:10px;z-index:3;background:rgba(7,87,232,.94);color:#fff;border-radius:9px;padding:7px 10px;font:900 11px/1 Arial,sans-serif;letter-spacing:.2px;box-shadow:0 3px 12px rgba(0,0,0,.25);pointer-events:none';
    box.appendChild(badge);
  }

  function swap(root = document) {
    root.querySelectorAll?.('.ca-product-photo img,.ca-detail-photo img').forEach(img => {
      const code = codeFor(img);
      if (!code) return;
      const wanted = photoFor(code);
      if (img.dataset.aveilotRealPhoto !== wanted) {
        img.dataset.aveilotRealPhoto = wanted;
        img.src = wanted;
        img.referrerPolicy = 'no-referrer';
        img.removeAttribute('onerror');
      }
      addBadge(img.parentElement, code);
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
