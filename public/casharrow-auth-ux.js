(() => {
  if (window.__cashArrowAuthUx) return;
  window.__cashArrowAuthUx = true;

  const byId = id => document.getElementById(id);

  function addStyle() {
    if (byId('casharrow-auth-ux-style')) return;
    const style = document.createElement('style');
    style.id = 'casharrow-auth-ux-style';
    style.textContent = `
      .ca-password-wrap{position:relative;margin-top:9px}
      .ca-password-wrap .field{margin-top:0;padding-right:72px}
      .ca-show-pass{position:absolute;right:8px;top:7px;border:0;background:#eef4ff;color:#0757e8;border-radius:9px;padding:7px 9px;font-size:11px;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  function passwordToggle(inputId, label) {
    const input = byId(inputId);
    if (!input || input.parentElement.classList.contains('ca-password-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'ca-password-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ca-show-pass';
    button.textContent = 'Show';
    button.setAttribute('aria-label', `${label} visibility`);
    button.onclick = () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.textContent = visible ? 'Show' : 'Hide';
    };
    wrap.appendChild(button);
  }

  function improvePhoneInputs() {
    ['registerPhone', 'loginPhone'].forEach(id => {
      const input = byId(id);
      if (!input) return;
      input.inputMode = 'tel';
      input.autocomplete = 'tel';
      input.placeholder = 'Phone number (e.g. 07XXXXXXXX)';
    });
  }

  function addEnterKeys() {
    ['registerName','registerPhone','registerPassword','registerConfirmPassword'].forEach(id => {
      const input = byId(id);
      if (!input || input.dataset.caEnter) return;
      input.dataset.caEnter = '1';
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          window.register?.();
        }
      });
    });
    ['loginPhone','loginPassword'].forEach(id => {
      const input = byId(id);
      if (!input || input.dataset.caEnter) return;
      input.dataset.caEnter = '1';
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          window.login?.();
        }
      });
    });
  }

  function start() {
    addStyle();
    improvePhoneInputs();
    passwordToggle('registerPassword', 'Password');
    passwordToggle('registerConfirmPassword', 'Confirm password');
    passwordToggle('loginPassword', 'Password');
    addEnterKeys();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
