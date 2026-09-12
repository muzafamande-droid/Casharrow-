(() => {
  const AVEILOT_PHOTOS = [
    'https://images.stockcake.com/public/1/e/6/1e616c57-f289-4d10-9ab9-1bb75b6d4a26_large/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/a/7/1a734b73-4db1-42d2-b8b6-a92d8e9341d2_small/futuristic-energy-core-stockcake.jpg',
    'https://images.stockcake.com/public/3/b/7/3b7f88ed-1421-4505-8431-f0f959a371ab_small/futuristic-mechanical-core-stockcake.jpg',
    'https://images.stockcake.com/public/1/2/8/128c7c7a-8e4a-41f8-a249-3b0c4d726169_small/futuristic-power-source-stockcake.jpg',
    'https://images.stockcake.com/public/8/d/f/8df1d8b9-0a4c-4509-931d-775a403a5f38_small/mechanical-core-illuminated-stockcake.jpg'
  ];

  function photoFor(code) {
    const m = String(code || '').toUpperCase().match(/\b([ABCD])([1-5])\b/);
    if (!m) return AVEILOT_PHOTOS[0];
    const series = m[1].charCodeAt(0) - 65;
    const number = Number(m[2]) - 1;
    return AVEILOT_PHOTOS[(series * 5 + number) % AVEILOT_PHOTOS.length];
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
        filter:saturate(1.08) contrast(1.08) brightness(.92);
      }
      .aveilot-sci-fi-stage{
        position:relative!important;overflow:hidden!important;
        background:#050816!important;
        box-shadow:inset 0 0 0 1px rgba(75,180,255,.28),0 12px 30px rgba(0,90,220,.20);
      }
      .aveilot-sci-fi-stage::after{
        content:'AVEILOT • POWER SYSTEM';position:absolute;right:9px;top:9px;
        z-index:4;color:#fff;font:900 9px/1 Arial,sans-serif;letter-spacing:1px;
        padding:7px 8px;border-radius:7px;background:rgba(3,17,45,.78);
        border:1px solid rgba(100,210,255,.55);pointer-events:none;
      }
    `;
    document.head.appendChild(style);
  }

  function loadReferralShare() {
    if (document.querySelector('script[data-casharrow-share-sheet]')) return;
    const script = document.createElement('script');
    script.src = '/share-referral.js?v=1';
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

        // Replace the old catalog SVG placeholder with the new AVEILOT
        // futuristic power-system visual. Admin-uploaded photos remain untouched.
        if (current) return;
        if (!wrap.querySelector('.aveilot-sci-fi-machine-photo')) {
          wrap.querySelector('svg')?.remove();
          const img = document.createElement('img');
          img.className = 'aveilot-sci-fi-machine-photo';
          img.src = wanted;
          img.alt = `${product?.name || 'AVEILOT PowerGen Machine'} futuristic power system`;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.referrerPolicy = 'no-referrer';
          wrap.prepend(img);
          wrap.classList.add('aveilot-sci-fi-stage');
        }
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
