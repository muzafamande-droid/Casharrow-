(() => {
  if (!localStorage.getItem('casharrowToken')) return;
  const start = () => {
    if (typeof window.cashArrowStartDashboard === 'function') {
      window.cashArrowStartDashboard();
      return true;
    }
    if (!document.getElementById('casharrowCompactHome')) {
      const script = document.createElement('script');
      script.src = '/member-dashboard-v2.js?v=9';
      script.onload = () => window.cashArrowStartDashboard?.();
      document.head.appendChild(script);
    }
    return true;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();