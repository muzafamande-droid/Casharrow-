(() => {
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
      const response = await fetch('/api/products', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const products = Array.isArray(data) ? data : (data.products || []);
      const byId = new Map(products.map(p => [String(p.id), p]));
      document.querySelectorAll('[data-rent-product]').forEach(button => {
        const product = byId.get(String(button.dataset.rentProduct));
        if (!product || !product.image_url) return;
        const wrap = button.closest('.rental-product-card')?.querySelector('.rental-product-image-wrap');
        if (!wrap || wrap.querySelector('.casharrow-admin-machine-photo')) return;
        const img = document.createElement('img');
        img.className = 'casharrow-admin-machine-photo';
        img.src = product.image_url;
        img.alt = product.name || product.code || 'CashArrow machine';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;background:#f5f8fc';
        wrap.querySelector('svg')?.remove();
        wrap.prepend(img);
      });
    } catch (error) {
      console.error('Unable to apply machine photos', error);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
