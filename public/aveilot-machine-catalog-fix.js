(() => {
  if (window.__aveilotMachineCatalogFix) return;
  window.__aveilotMachineCatalogFix = true;

  // Branding-only layer. Machine imagery is handled by aveilot-real-machine-photos.js.
  // Deliberately no SVG fallback here: AVEILOT should never show the old illustrated machines.
  const variants = {
    A1:'v1', A2:'v2', A3:'v3', A4:'v4', A5:'v5',
    B1:'v6', B2:'v7', B3:'v8', B4:'v9', B5:'v10',
    C1:'v11', C2:'v12', C3:'v13', C4:'v14', C5:'v15',
    D1:'v16', D2:'v17', D3:'v18', D4:'v19', D5:'v20'
  };

  function style() {
    if (document.getElementById('aveilotMachineCatalogFixStyle')) return;
    const s = document.createElement('style');
    s.id = 'aveilotMachineCatalogFixStyle';
    s.textContent = `
      .ca-product{position:relative}
      .ca-product h3,.ca-product p{font-family:Arial,sans-serif}
      .ca-product h3:after{content:'  •  AVEILOT';font-size:.55em;color:#0757e8;letter-spacing:.4px;vertical-align:middle}
      .ca-rental-head h2:before{content:'🏭 ';}
      .aveilot-rental-dialog{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,15,35,.72)}
      .aveilot-rental-card{width:min(430px,100%);background:#fff;border-radius:24px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.25);font-family:Arial,sans-serif}
      .aveilot-rental-card h2{margin:0 0 6px;font-size:22px;color:#172033}
      .aveilot-rental-sub{margin:0 0 16px;color:#667085;font-size:13px;line-height:1.45}
      .aveilot-rental-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0 16px}
      .aveilot-rental-stat{background:#f7f9fd;border:1px solid #e2e9f3;border-radius:13px;padding:11px}
      .aveilot-rental-stat span{display:block;color:#718096;font-size:11px;font-weight:700;margin-bottom:4px}
      .aveilot-rental-stat strong{display:block;color:#172033;font-size:15px}
      .aveilot-rental-stat.income{background:#edf8f1;border-color:#cdebd7}
      .aveilot-rental-stat.income strong{color:#147a3d}
      .aveilot-rental-warning{padding:12px;border-radius:13px;background:#fff4e8;border:1px solid #f3d3a5;color:#80551b;font-size:13px;line-height:1.45;margin-bottom:14px}
      .aveilot-rental-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .aveilot-rental-actions button{border:0;border-radius:13px;padding:13px;font-weight:900;min-height:48px;cursor:pointer}
      .aveilot-rental-cancel{background:#eef2f7;color:#172033}
      .aveilot-rental-confirm{background:#0757e8;color:#fff}
      .aveilot-rental-deposit{background:#0757e8;color:#fff}
      .aveilot-rental-confirm:disabled{opacity:.6;cursor:wait}
      @media(max-width:480px){.aveilot-rental-card{padding:18px}.aveilot-rental-grid{gap:7px}.aveilot-rental-stat strong{font-size:13px}}
    `;
    document.head.appendChild(s);
  }

  function fix(root=document.body) {
    style();
    const cards = root.querySelectorAll?.('.ca-product') || [];
    cards.forEach(card => {
      const code = String(card.querySelector('h3')?.textContent || '').match(/\b([ABCD][1-5])\b/i)?.[1]?.toUpperCase();
      if (!code) return;
      card.dataset.variant = variants[code] || 'v1';
      const title = card.querySelector('h3');
      if (title) title.textContent = `${code} · AVEILOT PowerGen Machine`;
      const desc = card.querySelector('p');
      if (desc) desc.textContent = `${code.charAt(0)} Series · AVEILOT PowerGen rental machine ${code}.`;
    });

    const heading = root.querySelector?.('.ca-rental-head h2');
    if (heading) heading.textContent = 'AVEILOT PowerGen Rentals';
    const sub = root.querySelector?.('.ca-rental-head p');
    if (sub) sub.textContent = 'Premium PowerGen machines — each model has its own visual identity.';
  }

  function closeRentalDialog() {
    document.getElementById('aveilotRentalDialog')?.remove();
  }

  function showRentalDialog({ title, subtitle='', stats=[], warning='', confirmText='Confirm Rental', actionText='', onAction, onConfirm }) {
    closeRentalDialog();
    const root = document.createElement('div');
    root.id = 'aveilotRentalDialog';
    root.className = 'aveilot-rental-dialog';
    root.innerHTML = `<div class="aveilot-rental-card" role="dialog" aria-modal="true" aria-label="AVEILOT rental dialog">
      <h2>${title}</h2>
      ${subtitle ? `<p class="aveilot-rental-sub">${subtitle}</p>` : ''}
      ${stats.length ? `<div class="aveilot-rental-grid">${stats.map(s=>`<div class="aveilot-rental-stat ${s.className||''}"><span>${s.label}</span><strong>${s.value}</strong></div>`).join('')}</div>` : ''}
      ${warning ? `<div class="aveilot-rental-warning">${warning}</div>` : ''}
      <div class="aveilot-rental-actions">
        <button type="button" class="aveilot-rental-cancel">Close</button>
        ${actionText && onAction ? `<button type="button" class="aveilot-rental-deposit">${actionText}</button>` : ''}
        ${onConfirm ? `<button type="button" class="aveilot-rental-confirm">${confirmText}</button>` : ''}
      </div>
    </div>`;
    document.body.appendChild(root);
    root.querySelector('.aveilot-rental-cancel').onclick = closeRentalDialog;
    const action = root.querySelector('.aveilot-rental-deposit');
    if (action) action.onclick = async () => {
      action.disabled = true;
      try { await onAction(); } catch (error) { action.disabled = false; }
    };
    const confirm = root.querySelector('.aveilot-rental-confirm');
    if (confirm) confirm.onclick = async () => {
      confirm.disabled = true;
      confirm.textContent = 'Processing…';
      try { await onConfirm(); } catch (error) {
        confirm.disabled = false;
        confirm.textContent = confirmText;
        showRentalDialog({title:'Rental could not be completed',subtitle:error?.message||'Please try again.',confirmText:'Close'});
      }
    };
    root.addEventListener('click', e => { if (e.target === root) closeRentalDialog(); });
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  }

  function money(value) {
    const amount = Number(value || 0);
    return `UGX ${amount.toLocaleString()}`;
  }

  function formatDaily(income, days) {
    const daily = days > 0 ? Number(income) / Number(days) : 0;
    return Number.isInteger(daily) ? `UGX ${daily.toLocaleString()}` : `UGX ${daily.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  }

  function openDepositForRental(fee) {
    closeRentalDialog();
    const section = document.getElementById('casharrowDeposit');
    const amount = document.getElementById('depositAmount');
    if (amount) amount.value = String(fee);
    if (typeof window.openAveilotDeposit === 'function') {
      window.openAveilotDeposit(fee);
      return;
    }
    if (section) {
      section.style.display = 'block';
      section.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    alert('Please open your Wallet and choose Deposit Funds.');
  }

  async function handleRentalClick(button) {
    const token = localStorage.getItem('casharrowToken') || '';
    if (!token) {
      showRentalDialog({title:'Login required',subtitle:'Please log in to your AVEILOT account before renting a machine.'});
      return;
    }

    const response = await fetch('/api/products', {cache:'no-store'});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.message || 'Unable to load machine details.');
    const products = Array.isArray(data) ? data : (data.products || []);
    const product = products.find(item => String(item.id) === String(button.dataset.rentProduct));
    if (!product) throw new Error('This machine is no longer available.');

    const fee = Number(product.rental_fee ?? product.fee ?? 0);
    const income = Number(product.return_amount ?? product.income ?? 0);
    const days = Number(product.rental_days ?? product.duration_days ?? 0);
    const name = esc(product.name || 'AVEILOT PowerGen Machine');
    const code = String(product.name || '').match(/\b([ABCD][1-5])\b/i)?.[1]?.toUpperCase() || product.name || 'AVEILOT Machine';

    // Check the live wallet before asking the member to confirm a purchase.
    const walletResponse = await fetch('/api/wallet', {headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
    const walletData = await walletResponse.json().catch(()=>({}));
    if (!walletResponse.ok) throw new Error(walletData.message || 'Unable to check your wallet balance.');
    const balance = Number(walletData.wallet?.balance ?? walletData.balance ?? 0);

    if (balance < fee) {
      showRentalDialog({
        title:'Insufficient balance',
        subtitle:`You need ${money(fee)} to rent ${name}. Your available balance is ${money(balance)}.`,
        warning:'Please deposit funds into your AVEILOT wallet to continue.',
        actionText:'Deposit Funds',
        onAction:()=>openDepositForRental(fee)
      });
      return;
    }

    showRentalDialog({
      title:code,
      subtitle:'Review the rental details before confirming.',
      stats:[
        {label:'Rental fee',value:money(fee)},
        {label:'Daily income',value:formatDaily(income,days),className:'income'},
        {label:'Rental period',value:`${days} days`},
        {label:'Total return',value:money(income),className:'income'}
      ],
      confirmText:'Confirm Rental',
      onConfirm: async () => {
        const rentalResponse = await fetch('/api/rentals', {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({productId:product.id})});
        const payload = await rentalResponse.json().catch(()=>({}));
        if (!rentalResponse.ok) throw new Error(payload.error || payload.message || 'Rental could not be completed.');
        closeRentalDialog();
        showRentalDialog({title:'Rental successful',subtitle:`${name} has been added to your machines.`,stats:[{label:'Rental fee',value:money(fee)},{label:'Daily income',value:formatDaily(income,days),className:'income'},{label:'Rental period',value:`${days} days`},{label:'Total return',value:money(income),className:'income'}]});
        setTimeout(()=>window.location.reload(),1400);
      }
    });
  }

  function installRentalDialog() {
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-rent-product]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleRentalClick(button).catch(error => showRentalDialog({title:'Unable to start rental',subtitle:error?.message||'Please try again.'}));
    }, true);
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fix(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once:true });
  else schedule();

  installRentalDialog();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
