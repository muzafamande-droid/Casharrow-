(() => {
  if (window.__aveilotRentalEarningsUI) return;
  window.__aveilotRentalEarningsUI = true;

  const token = () => localStorage.getItem('casharrowToken');
  const money = value => `UGX ${Number(value || 0).toLocaleString()}`;

  async function load() {
    if (!token()) return;
    try {
      const response = await fetch('/api/rental-earnings', {
        headers: { Authorization: `Bearer ${token()}` },
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok || !data.success) return;

      document.querySelectorAll('[data-complete-rental]').forEach(button => {
        button.closest('.ca-rental-actions')?.remove();
        button.remove();
      });

      const rentals = Array.isArray(data.rentals) ? data.rentals : [];
      rentals.forEach(rental => {
        const id = String(rental.id);
        const card = [...document.querySelectorAll('.ca-rental-item')].find(el => el.querySelector(`[data-complete-rental="${id}"]`));
        if (card) card.querySelector('.ca-rental-actions')?.remove();
      });

      rentals.forEach(rental => {
        const id = String(rental.id);
        const candidates = [...document.querySelectorAll('.ca-rental-item')];
        const card = candidates.find(el => el.dataset.aveilotRentalId === id) || candidates.find(el => {
          const text = el.textContent || '';
          return text.includes(String(rental.code || '')) && text.includes(money(rental.rental_fee));
        });
        if (!card) return;
        card.dataset.aveilotRentalId = id;
        let panel = card.querySelector('.aveilot-earning-panel');
        if (!panel) {
          panel = document.createElement('div');
          panel.className = 'aveilot-earning-panel';
          panel.style.cssText = 'margin-top:12px;padding:12px;border-radius:14px;background:#f5f8fd;border:1px solid #e1e8f3;font-size:12px;line-height:1.55';
          card.appendChild(panel);
        }
        const daily = Number(rental.daily_amount || 0);
        const generated = Number(rental.generated_total || 0);
        const remaining = Number(rental.days_remaining || 0);
        panel.innerHTML = `<strong style="display:block;margin-bottom:5px;color:#07162f">Daily machine income</strong><div>Daily amount: <b>${money(daily)}</b></div><div>Total generated: <b>${money(generated)}</b></div><div>Days earned: <b>${Number(rental.days_earned || 0)}</b></div><div>Days remaining: <b>${remaining}</b></div><div style="margin-top:5px;color:#718096">Income is credited automatically each day. No manual completion is required.</div>`;
      });
    } catch (error) {
      console.warn('AVEILOT rental earnings UI:', error);
    }
  }

  function start() {
    load();
    setInterval(load, 60000);
    const observer = new MutationObserver(() => load());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
