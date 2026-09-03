(() => {
  if (window.__casharrowUiFixes) return;
  window.__casharrowUiFixes = true;

  const css = document.createElement('style');
  css.textContent = `
    /* Keep the standalone rental catalog readable before it is opened in Rentals. */
    .ca-rental-catalog{background:#0b2147!important;color:#fff!important;border:1px solid #78aaff2e!important;border-radius:16px!important;padding:12px!important;margin-top:14px!important}
    .ca-rental-catalog .ca-rental-head h2{font-size:17px!important;color:#fff!important}
    .ca-rental-catalog .ca-rental-head p{font-size:11px!important;color:#9fb4d5!important}
    .ca-rental-catalog .ca-series-tabs{display:flex!important;overflow-x:auto!important;gap:7px!important;scrollbar-width:none!important}
    .ca-rental-catalog .ca-series-tabs::-webkit-scrollbar{display:none}
    .ca-rental-catalog .ca-series-tab{flex:0 0 auto!important;min-width:72px!important;background:#102b58!important;color:#dce9ff!important;border:1px solid #8ab4ff22!important;border-radius:10px!important;padding:8px 10px!important;font-size:10px!important;box-shadow:none!important}
    .ca-rental-catalog .ca-series-tab.active{background:#0757e8!important;color:#fff!important}
    .ca-rental-catalog .ca-series-tab small{font-size:9px!important;color:#9fb4d5!important}
    .ca-rental-catalog .ca-series-panel{background:#071a38!important;color:#fff!important;border-radius:12px!important;padding:10px!important;box-shadow:none!important}
    .ca-rental-catalog .ca-product{grid-template-columns:64px 1fr auto!important;gap:10px!important;padding:10px 0!important;align-items:center!important}
    .ca-rental-catalog .ca-product img{width:60px!important;height:60px!important;border-radius:12px!important;object-fit:cover!important;background:#102b58!important}
    .ca-rental-catalog .ca-product h3{font-size:13px!important;color:#fff!important;margin:0!important}
    .ca-rental-catalog .ca-product p{font-size:11px!important;line-height:1.4!important;color:#b7c9e5!important;margin-top:4px!important}
    .ca-rental-catalog .ca-product button{padding:8px 10px!important;border-radius:9px!important;font-size:11px!important}
    .ca-rental-catalog .ca-note{font-size:10px!important;color:#9fb4d5!important}
    @media(max-width:480px){.ca-rental-catalog .ca-product{grid-template-columns:58px 1fr auto!important}.ca-rental-catalog .ca-product img{width:54px!important;height:54px!important}.ca-rental-catalog .ca-product h3{font-size:12px!important}.ca-rental-catalog .ca-product p{font-size:10px!important}.ca-rental-catalog .ca-product button{padding:7px 8px!important;font-size:10px!important}}
  `;
  document.head.appendChild(css);

  function preserveMovedSections() {
    const main = document.querySelector('main.container');
    const panel = document.getElementById('ca2panel');
    if (!main || !panel) return;
    ['casharrowDeposit','withdrawSection','casharrowRentalCatalog'].forEach(id => {
      const n = document.getElementById(id);
      if (n && panel.contains(n)) {
        main.appendChild(n);
        n.style.display = 'none';
        n.removeAttribute('data-cash-arrow-open');
      }
    });
  }

  function watchDashboard() {
    document.addEventListener('click', event => {
      const b = event.target.closest('#casharrowCompactHome [data-k]');
      if (b) preserveMovedSections();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchDashboard, {once:true});
  else watchDashboard();
})();
