(() => {
  if (window.__casharrowUiFixes) return;
  window.__casharrowUiFixes = true;

  const css = document.createElement('style');
  css.textContent = `
    body { font-size:16px!important; }
    button, .btn, a.btn, input, select { font-size:16px!important; min-height:46px; }
    .ca-rental-catalog{background:#0b2147!important;color:#fff!important;border:1px solid #78aaff2e!important;border-radius:16px!important;padding:14px!important;margin-top:14px!important}
    .ca-rental-catalog .ca-rental-head h2{font-size:22px!important;color:#fff!important}
    .ca-rental-catalog .ca-rental-head p{font-size:14px!important;color:#b7c9e5!important}
    .ca-rental-catalog .ca-series-tabs{display:flex!important;overflow-x:auto!important;gap:8px!important;scrollbar-width:none!important}
    .ca-rental-catalog .ca-series-tabs::-webkit-scrollbar{display:none}
    .ca-rental-catalog .ca-series-tab{flex:0 0 auto!important;min-width:82px!important;background:#102b58!important;color:#dce9ff!important;border:1px solid #8ab4ff22!important;border-radius:10px!important;padding:10px 12px!important;font-size:14px!important;box-shadow:none!important}
    .ca-rental-catalog .ca-series-tab.active{background:#0757e8!important;color:#fff!important}
    .ca-rental-catalog .ca-series-tab small{font-size:12px!important;color:#b7c9e5!important}
    .ca-rental-catalog .ca-series-panel{background:#071a38!important;color:#fff!important;border-radius:12px!important;padding:12px!important;box-shadow:none!important}
    .ca-rental-catalog .ca-product{grid-template-columns:64px 1fr auto!important;gap:10px!important;padding:12px 0!important;align-items:center!important}
    .ca-rental-catalog .ca-product img{width:60px!important;height:60px!important;border-radius:12px!important;object-fit:cover!important;background:#102b58!important}
    .ca-rental-catalog .ca-product h3{font-size:17px!important;color:#fff!important;margin:0!important}
    .ca-rental-catalog .ca-product p{font-size:14px!important;line-height:1.45!important;color:#c6d5eb!important;margin-top:5px!important}
    .ca-rental-catalog .ca-product button{padding:10px 14px!important;border-radius:9px!important;font-size:16px!important;font-weight:800!important;min-height:46px!important}
    .ca-rental-catalog .ca-note{font-size:13px!important;color:#b7c9e5!important}
    .modalbox{max-height:90vh!important;overflow:auto!important}
    body.ca-auth-open .bottom{opacity:0!important;pointer-events:none!important}
    .ca-auth-footer{margin-top:18px;padding-top:14px;border-top:1px solid #edf1f6;text-align:center}
    .ca-auth-footer strong{display:block;font-size:14px;margin-bottom:4px}
    .ca-auth-footer span{font-size:13px;color:#718096}
    .ca-referral-wrap{margin:10px 0 2px}
    .ca-referral-label{display:block;font-size:14px;color:#718096;margin:2px 0 5px}
    .ca-referral-note{font-size:12px;color:#718096;margin:3px 0 0}
    .ca-notice{position:fixed;left:16px;right:16px;top:76px;z-index:80;max-width:520px;margin:auto;background:#fff;border:1px solid #dce7f8;border-radius:18px;box-shadow:0 12px 35px #0002;padding:18px 48px 18px 18px}
    .ca-notice h3{font-size:19px;margin-bottom:6px}
    .ca-notice p{font-size:14px;line-height:1.5;color:#5f6b7a}
    .ca-notice button{position:absolute;right:9px;top:9px;width:36px;height:36px;padding:0;background:#eef2f7;font-size:22px;line-height:1}
    .ca-notice .ca-notice-action{position:static;width:auto;height:auto;margin-top:12px;padding:10px 14px;background:#0757e8;color:#fff;font-size:16px;font-weight:800}
    .ca-machine-buy{font-size:18px!important;font-weight:800!important;min-height:52px!important;padding:12px 18px!important}
    .ca-hidden-financial-duplicate{display:none!important}
    @media(max-width:480px){
      .ca-rental-catalog .ca-product{grid-template-columns:58px 1fr auto!important}
      .ca-rental-catalog .ca-product img{width:54px!important;height:54px!important}
      .ca-rental-catalog .ca-product h3{font-size:16px!important}
      .ca-rental-catalog .ca-product p{font-size:13px!important}
      .ca-rental-catalog .ca-product button{padding:9px 12px!important;font-size:16px!important}
      .ca-notice{top:68px}
    }
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

  function installAuthPolish() {
    const modal = document.getElementById('modal');
    if (!modal || modal.dataset.caPolished) return;
    modal.dataset.caPolished = '1';
    const sync = () => document.body.classList.toggle('ca-auth-open', modal.style.display === 'flex');
    new MutationObserver(sync).observe(modal, { attributes:true, attributeFilter:['style'] });
    const box = modal.querySelector('.modalbox');
    if (box && !box.querySelector('.ca-auth-footer')) {
      const footer = document.createElement('div');
      footer.className = 'ca-auth-footer';
      footer.innerHTML = '<strong>Welcome to CashArrow</strong><span>🔒 Your account information is protected.</span>';
      box.appendChild(footer);
    }
  }

  function installReferralSignup() {
    const form = document.getElementById('registerForm');
    if (!form || form.dataset.caReferralReady) return;
    form.dataset.caReferralReady = '1';
    const password = document.getElementById('registerPassword');
    if (!password) return;
    const wrap = document.createElement('div');
    wrap.className = 'ca-referral-wrap';
    wrap.innerHTML = '<label class="ca-referral-label" for="casharrowReferralCode">Referral code <span>(optional)</span></label><input id="casharrowReferralCode" placeholder="Enter referral code"><div class="ca-referral-note">Use your friend\'s link/code so they can earn 10% from your first machine rental.</div>';
    password.insertAdjacentElement('afterend', wrap);
    let code = '';
    try {
      const urlCode = new URLSearchParams(location.search).get('ref');
      code = urlCode || sessionStorage.getItem('casharrowPendingReferral') || '';
      if (urlCode) sessionStorage.setItem('casharrowPendingReferral', urlCode.toUpperCase());
    } catch (e) {}
    const input = document.getElementById('casharrowReferralCode');
    if (code) input.value = code.toUpperCase();
  }

  function installReferralFetchBridge() {
    if (window.__casharrowReferralFetchBridge) return;
    window.__casharrowReferralFetchBridge = true;
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.includes('/api/register') && init && typeof init.body === 'string') {
        try {
          const payload = JSON.parse(init.body);
          const referral = document.getElementById('casharrowReferralCode');
          const code = referral && referral.value.trim().toUpperCase();
          if (code) {
            payload.referralCode = code;
            sessionStorage.removeItem('casharrowPendingReferral');
            init = { ...init, body: JSON.stringify(payload) };
          }
        } catch (e) {}
      }
      return originalFetch.call(this, input, init);
    };
  }

  function installVisitorNotice() {
    if (localStorage.getItem('casharrowWelcomeNoticeDismissed')) return;
    if (localStorage.getItem('casharrowToken')) return;
    if (document.querySelector('.ca-notice')) return;
    const notice = document.createElement('div');
    notice.className = 'ca-notice';
    notice.innerHTML = '<button type="button" aria-label="Close">×</button><h3>🏹 Welcome to CashArrow</h3><p>Explore our machines, create your account, and start your CashArrow journey. Have a referral link? Open it before signing up so your referral is connected.</p><button type="button" class="ca-notice-action">Buy a Machine</button>';
    document.body.appendChild(notice);
    const close = () => { localStorage.setItem('casharrowWelcomeNoticeDismissed','1'); notice.remove(); };
    notice.querySelector('button').onclick = close;
    notice.querySelector('.ca-notice-action').onclick = () => { close(); if (typeof openModal === 'function') openModal('register'); };
  }

  function replaceLoginLabels() {
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
      const label = (el.textContent || '').trim().toLowerCase();
      if (label === 'login' || label === 'log in') {
        el.textContent = 'Buy';
        el.setAttribute('aria-label', 'Buy a machine');
      }
      if (/^rent( machine)?$/.test(label)) {
        el.textContent = 'Buy';
        el.classList.add('ca-machine-buy');
      }
    });
  }

  function watchDashboard() {
    document.addEventListener('click', event => {
      const b = event.target.closest('#casharrowCompactHome [data-k]');
      if (b) preserveMovedSections();
    }, true);
    const observer = new MutationObserver(() => replaceLoginLabels());
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function boot() {
    installAuthPolish();
    installReferralSignup();
    installReferralFetchBridge();
    installVisitorNotice();
    replaceLoginLabels();
    watchDashboard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
