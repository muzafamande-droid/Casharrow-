(() => {
  const hasToken = () => !!localStorage.getItem('casharrowToken');
  if (!hasToken()) return;

  const start = () => {
    if (!hasToken()) return false;
    if (typeof window.cashArrowStartDashboard === 'function') {
      window.cashArrowStartDashboard();
      return true;
    }
    if (!document.getElementById('casharrowCompactHome')) {
      const script = document.createElement('script');
      script.src = '/member-dashboard-v2.js?v=11';
      script.onload = () => {
        if (hasToken()) window.cashArrowStartDashboard?.();
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
