(() => {
  if (window.__cashArrowAuthUx) return;
  window.__cashArrowAuthUx = true;

  const byId = id => document.getElementById(id);
  const token = () => localStorage.getItem('casharrowToken');
  const referralFromUrl = () => {
    try { return new URLSearchParams(location.search).get('ref')?.trim().toUpperCase() || ''; }
    catch { return ''; }
  };

  function addStyle() {
    if (byId('casharrow-auth-ux-style')) return;
    const style = document.createElement('style');
    style.id = 'casharrow-auth-ux-style';
    style.textContent = `
      .ca-auth-help{font-size:12px;color:#718096;line-height:1.45;margin:7px 2px 0}
      .ca-password-wrap{position:relative;margin-top:9px}
      .ca-password-wrap .field{margin-top:0;padding-right:74px}
      .ca-show-pass{position:absolute;right:8px;top:7px;border:0;background:#eef4ff;color:#0757e8;border-radius:9px;padding:7px 9px;font-size:11px;font-weight:800}
      .ca-submit-loading{opacity:.72;pointer-events:none}
      .ca-ref-detected{display:block!important;background:#edf8f1!important;color:#147a3d!important;border:1px solid #cdebd7}
      .ca-auth-status{margin-top:10px;padding:10px 12px;border-radius:11px;background:#eef5ff;color:#28415f;font-size:12px;line-height:1.45}
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

  function setButtonLoading(button, loading, text) {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.textContent = text;
      button.classList.add('ca-submit-loading');
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.classList.remove('ca-submit-loading');
      button.disabled = false;
    }
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

  function improveReferral() {
    const code = referralFromUrl();
    const input = byId('registerReferral');
    const note = byId('referralNote');
    if (!input) return;
    if (code) {
      input.value = code;
      input.readOnly = true;
      input.classList.add('ca-ref-detected');
      if (note) {
        note.textContent = `🎁 Referral link detected. ${code} will be attached automatically.`;
        note.classList.add('ca-ref-detected');
        note.style.display = 'block';
      }
    }
  }

  function patchRegistration() {
    const originalRegister = window.register;
    if (typeof originalRegister !== 'function' || originalRegister.__caWrapped) return;

    async function wrappedRegister() {
      const name = byId('registerName')?.value.trim() || '';
      const phone = byId('registerPhone')?.value.trim() || '';
      const password = byId('registerPassword')?.value || '';
      const confirmPassword = byId('registerConfirmPassword')?.value || '';
      const referralCode = byId('registerReferral')?.value.trim().toUpperCase() || '';
      const button = document.querySelector('#registerForm button.primary');

      if (!name || !phone || !password || !confirmPassword) return originalRegister();
      if (password !== confirmPassword || password.length < 6) return originalRegister();

      setButtonLoading(button, true, 'Creating account…');
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({name, phone, password, confirmPassword, referralCode: referralCode || undefined}),
          cache: 'no-store'
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.message || 'Registration failed');

        const loginResponse = await fetch('/api/login', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({phone, password}),
          cache: 'no-store'
        });
        const loginData = await loginResponse.json().catch(() => ({}));
        if (!loginResponse.ok || !loginData.success) {
          const msg = byId('registerMessage');
          if (msg) {
            msg.textContent = 'Account created. Please use Login once to enter.';
            msg.style.display = 'block';
          }
          return;
        }

        localStorage.setItem('casharrowToken', loginData.token);
        localStorage.setItem('casharrowUser', JSON.stringify(loginData.user));
        const msg = byId('registerMessage');
        if (msg) {
          msg.textContent = '✅ Account created. Logging you in…';
          msg.style.display = 'block';
        }
        if (loginData.user.role === 'admin') location.replace('/admin.html');
        else location.replace('/member.html?ca=' + Date.now());
      } catch (error) {
        const msg = byId('registerMessage');
        if (msg) {
          msg.textContent = error.message || 'Unable to connect to AVEILOT server.';
          msg.style.display = 'block';
        }
      } finally {
        setButtonLoading(button, false, 'Create Account');
      }
    }
    wrappedRegister.__caWrapped = true;
    window.register = wrappedRegister;
  }

  function addEnterKeys() {
    ['registerName','registerPhone','registerPassword','registerConfirmPassword','registerReferral'].forEach(id => {
      const input = byId(id);
      if (!input || input.dataset.caEnter) return;
      input.dataset.caEnter = '1';
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); window.register?.(); }
      });
    });
    ['loginPhone','loginPassword'].forEach(id => {
      const input = byId(id);
      if (!input || input.dataset.caEnter) return;
      input.dataset.caEnter = '1';
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); window.login?.(); }
      });
    });
  }

  function start() {
    addStyle();
    improvePhoneInputs();
    improveReferral();
    passwordToggle('registerPassword', 'Password');
    passwordToggle('registerConfirmPassword', 'Confirm password');
    passwordToggle('loginPassword', 'Password');
    patchRegistration();
    addEnterKeys();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
