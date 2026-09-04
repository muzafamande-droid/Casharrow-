(() => {
  const hasToken = () => !!localStorage.getItem('casharrowToken');
  if (!hasToken()) return;

  const loadMachineBranding = () => {
    if (!hasToken() || window.__aveilotMachineBranding) return;
    const script = document.createElement('script');
    script.src = '/aveilot-machine-branding.js?v=1';
    script.onerror = () => console.error('AVEILOT machine branding failed to load.');
    document.head.appendChild(script);
  };

  const start = () => {
    if (!hasToken()) return false;
    if (typeof window.cashArrowStartDashboard === 'function') {
      window.cashArrowStartDashboard();
      loadMachineBranding();
      return true;
    }
    if (!document.getElementById('casharrowCompactHome')) {
      const script = document.createElement('script');
      script.src = '/member-dashboard-v2.js?v=13';
      script.onload = () => {
        if (hasToken()) {
          window.cashArrowStartDashboard?.();
          loadMachineBranding();
        }
      };
      script.onerror = () => console.error('CashArrow member dashboard failed to load.');
      document.head.appendChild(script);
    }
    return true;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
