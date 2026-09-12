(() => {
  if (window.__aveilotMachinePhotoDisplay) return;
  window.__aveilotMachinePhotoDisplay = true;

  // AVEILOT launch photo set.
  // Varied high-resolution generator / industrial power-system visuals.
  // Admin-uploaded machine photos always take priority over these defaults.
  const AVEILOT_PHOTOS = [
    'https://images.pexels.com/photos/18816918/pexels-photo-18816918.jpeg?cs=srgb&dl=pexels-igovar-igovar-3000547-18816918.jpg&fm=jpg',
    'https://images.pexels.com/photos/35042792/pexels-photo-35042792.jpeg?cs=srgb&dl=pexels-theshuttervision-35042792.jpg&fm=jpg',
    'https://images.pexels.com/photos/5693845/pexels-photo-5693845.jpeg?cs=srgb&dl=pexels-ezrah-lane-3654374-5693845.jpg&fm=jpg',
    'https://images.pexels.com/photos/20091612/pexels-photo-20091612.jpeg?cs=srgb&dl=pexels-richard-wilson-779692900-20091612.jpg&fm=jpg',
    'https://images.stockcake.com/public/c/2/1/c21e252f-6a70-454d-8130-124d2be845d0_large/colossal-turbine-engine-stockcake.jpg',
    'https://images.stockcake.com/public/c/7/c/c7c13a81-5dc1-4cc3-8e33-012430c7007b_large/dynamic-industrial-turbine-stockcake.jpg',
    'https://images.stockcake.com/public/e/b/4/eb453184-925f-4963-b8eb-ad9d2bcabee5_large/green-energy-machine-stockcake.jpg',
    'https://images.stockcake.com/public/2/c/2/2c277ee3-8151-450a-8c5b-6685ab084196_large/industrial-turbine-assembly-stockcake.jpg'
  ];

  // Spread the eight launch visuals across the 20-product catalog so
  // neighbouring cards do not immediately repeat the same image.
  const CODE_TO_PHOTO = {
    A1:0,A2:1,A3:2,A4:3,A5:4,
    B1:5,B2:6,B3:7,B4:2,B5:0,
    C1:3,C2:5,C3:1,C4:6,C5:4,
    D1:7,D2:2,D3:5,D4:0,D5:3
  };

  function photoFor(code) {
    const c = String(code || '').toUpperCase().match(/\b([ABCD][1-5])\b/)?.[1] || 'A1';
    return AVEILOT_PHOTOS[CODE_TO_PHOTO[c] ?? 0];
  }

  function codeForButton(button, product) {
    return String(product?.code || product?.name || button?.dataset?.rentProduct || 'A1')
      .toUpperCase().match(/\b([ABCD][1-5])\b/)?.[1] || 'A1';
  }

  function addStyles() {
    if (document.getElementById('aveilot-sci-fi-machine-style')) return;
    const style = document.createElement('style');
    style.id = 'aveilot-sci-fi-machine-style';
    style.textContent = `
      .aveilot-sci-fi-machine-photo{
        display:block!important;width:100%!important;height:100%!important;
        object-fit:cover!important;background:#050816!important;
        filter:saturate(1.04) contrast(1.05) brightness(.96);
        transition:transform .35s ease,filter .35s ease;
      }
      .aveilot-sci-fi-stage{
        position:relative!important;overflow:hidden!important;
        background:#050816!important;
        box-shadow:inset 0 0 0 1px rgba(75,180,255,.25),0 12px 30px rgba(0,90,220,.18);
      }
      .aveilot-sci-fi-stage:hover .aveilot-sci-fi-machine-photo{
        transform:scale(1.025);filter:saturate(1.08) contrast(1.07) brightness(1);
      }
      .aveilot-sci-fi-stage::after{
        content:'AVEILOT • POWER SYSTEM';position:absolute;right:9px;top:9px;
        z-index:4;color:#fff;font:900 9px/1 Arial,sans-serif;letter-spacing:1px;
        padding:7px 8px;border-radius:7px;background:rgba(3,17,45,.78);
        border:1px solid rgba(100,210,255,.55);pointer-events:none;
      }
      .aveilot-sci-fi-stage .rental-series-badge{z-index:5}
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

  async function applyPhotos() {
    try {
      addStyles();
      const response = await fetch('/api/products', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const products = Array.isArray(data) ? data : (data.products || []);
      const byId = new Map(products.map(p => [String(p.id), p]));

      document.querySelectorAll('[data-rent-product]').forEach(button => {
        const product = byId.get(String(button.dataset.rentProduct));
        const wrap = button.closest('.rental-product-card')?.querySelector('.rental-product-image-wrap');
        if (!wrap) return;

        const code = codeForButton(button, product);
        const wanted = photoFor(code);
        const current = wrap.querySelector('.casharrow-admin-machine-photo');

        // Never overwrite a photo selected by the admin.
        if (current) return;

        let img = wrap.querySelector('.aveilot-sci-fi-machine-photo');
        if (!img) {
          wrap.querySelector('svg')?.remove();
          img = document.createElement('img');
          img.className = 'aveilot-sci-fi-machine-photo';
          img.alt = `${product?.name || 'AVEILOT PowerGen Machine'} power system`;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.referrerPolicy = 'no-referrer';
          wrap.prepend(img);
        }

        if (img.dataset.aveilotPhoto !== wanted) {
          img.dataset.aveilotPhoto = wanted;
          img.src = wanted;
        }

        wrap.classList.add('aveilot-sci-fi-stage');
      });
    } catch (error) {
      console.error('Unable to apply AVEILOT machine photos', error);
    }
  }

  const start = () => {
    loadReferralShare();
    applyPhotos();
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(applyPhotos, 150);
      loadReferralShare();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
