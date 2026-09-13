(() => {
  if (window.__aveilotMachinePhotoDisplay) return;
  window.__aveilotMachinePhotoDisplay = true;

  // AVEILOT photo compatibility layer.
  // IMPORTANT: admin-managed image_url values are authoritative.
  // This script decorates existing machine photos only and never replaces them.
  function addStyles() {
    if (document.getElementById('aveilot-machine-photo-style')) return;
    const style = document.createElement('style');
    style.id = 'aveilot-machine-photo-style';
    style.textContent = `
      .aveilot-sci-fi-machine-photo{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;background:#050816!important;transition:transform .35s ease,filter .35s ease}
      .aveilot-sci-fi-stage{position:relative!important;overflow:hidden!important;background:#050816!important;box-shadow:inset 0 0 0 1px rgba(75,180,255,.25),0 12px 30px rgba(0,90,220,.18)}
      .aveilot-sci-fi-stage:hover .aveilot-sci-fi-machine-photo{transform:scale(1.025);filter:saturate(1.08) contrast(1.07) brightness(1)}
      .aveilot-sci-fi-stage::after{content:'AVEILOT • POWER SYSTEM';position:absolute;right:9px;top:9px;z-index:4;color:#fff;font:900 9px/1 Arial,sans-serif;letter-spacing:1px;padding:7px 8px;border-radius:7px;background:rgba(3,17,45,.78);border:1px solid rgba(100,210,255,.55);pointer-events:none}
      @media(prefers-reduced-motion:reduce){.aveilot-sci-fi-machine-photo{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function loadReferralShare() {
    if (document.querySelector('script[data-casharrow-share-sheet]')) return;
    const script = document.createElement('script');
    script.src = '/share-referral.js?v=2';
    script.async = true;
    script.dataset.casharrowShareSheet = '1';
    document.head.appendChild(script);
  }

  function decoratePhotos() {
    addStyles();
    document.querySelectorAll('.rental-product-image-wrap').forEach(wrap => {
      // Never replace an image rendered by the catalog/admin system.
      const image = wrap.querySelector('.admin-machine-image');
      const existing = wrap.querySelector('.aveilot-sci-fi-machine-photo');
      if (!image && !existing) return;
      if (image) image.classList.add('aveilot-sci-fi-machine-photo');
      wrap.classList.add('aveilot-sci-fi-stage');
    });
  }

  const start = () => {
    loadReferralShare();
    decoratePhotos();
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(decoratePhotos, 150);
      loadReferralShare();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();