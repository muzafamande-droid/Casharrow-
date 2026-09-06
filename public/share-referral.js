(() => {
  function getReferralLink() {
    try {
      const user = JSON.parse(localStorage.getItem('casharrowUser') || '{}');
      const code = String(user.referralCode || user.referral_code || '').trim().toUpperCase();
      return code ? `${location.origin}/?ref=${encodeURIComponent(code)}` : '';
    } catch { return ''; }
  }

  async function share() {
    const link = getReferralLink();
    if (!link) return alert('Your referral link is not available yet.');
    const text = 'Join me on CashArrow and start earning with me:';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'CashArrow', text, url: link });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    // Older browsers: open WhatsApp as a useful direct fallback rather than silently copying.
    const message = encodeURIComponent(`${text} ${link}`);
    location.href = `https://wa.me/?text=${message}`;
  }

  function wire() {
    ['shareReferral', 'shareAccountReferral'].forEach(id => {
      const button = document.getElementById(id);
      if (!button || button.dataset.shareSheetWired) return;
      button.dataset.shareSheetWired = '1';
      button.onclick = share;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true }); else wire();
  new MutationObserver(wire).observe(document.body, { childList: true, subtree: true });
})();
