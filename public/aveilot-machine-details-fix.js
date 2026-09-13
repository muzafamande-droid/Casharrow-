(() => {
  if (window.__aveilotMachineDetailsFix) return;
  window.__aveilotMachineDetailsFix = true;

  const money = v => `UGX ${Number(v || 0).toLocaleString()}`;
  const token = () => localStorage.getItem('casharrowToken') || '';
  let products = [];

  const css = document.createElement('style');
  css.textContent = `.aveilot-md-modal{position:fixed;inset:0;z-index:100000;background:rgba(2,10,25,.75);display:flex;align-items:center;justify-content:center;padding:16px}.aveilot-md-box{width:min(480px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;box-shadow:0 25px 70px rgba(0,0,0,.4)}.aveilot-md-img{width:100%;height:240px;object-fit:cover;background:#eef3f8;display:block}.aveilot-md-body{padding:18px}.aveilot-md-body h2{margin:0 0 5px;color:#07162f}.aveilot-md-sub{font-size:11px;color:#718096;margin-bottom:14px}.aveilot-md-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.aveilot-md-stat{padding:11px;border-radius:13px;background:#f4f7fb}.aveilot-md-stat small{display:block;color:#718096;font-size:10px;margin-bottom:4px}.aveilot-md-stat strong{font-size:14px}.aveilot-md-stat.daily{background:#edf8f1}.aveilot-md-stat.daily strong{color:#147a3d}.aveilot-md-actions{display:flex;gap:9px;margin-top:16px}.aveilot-md-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800}.aveilot-md-close{background:#edf1f6}.aveilot-md-rent{background:#132f52;color:#fff}.aveilot-md-error{margin-top:10px;padding:10px;border-radius:10px;background:#fff2f2;color:#b42318;font-size:12px}@media(max-width:480px){.aveilot-md-img{height:205px}}`;
  document.head.appendChild(css);

  async function getProducts() {
    if (products.length) return products;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch('/api/products', {cache:'no-store', signal:controller.signal});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || d.error || `Unable to load machine details (${r.status})`);
      products = Array.isArray(d) ? d : (d.products || []);
      return products;
    } finally {
      clearTimeout(timeout);
    }
  }

  function values(p){
    const fee=Number(p.rental_fee||p.fee||0), total=Number(p.return_amount||p.income||0), days=Number(p.rental_days||p.duration_days||0);
    return {fee,total,days,daily:days?Math.round(total/days*100)/100:0};
  }

  function image(p){
    const url=String(p.image_url||p.imageUrl||'').trim();
    if(url) return `<img class="aveilot-md-img" src="${url.replace(/"/g,'&quot;')}" alt="AVEILOT machine">`;
    return `<div class="aveilot-md-img" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#071b35,#1769ff);color:#fff;font-size:34px;font-weight:900">${p.code||'AVEILOT'}</div>`;
  }

  function close(){document.querySelector('.aveilot-md-modal')?.remove();}

  function open(p){
    close();
    const v=values(p);
    const m=document.createElement('div');
    m.className='aveilot-md-modal';
    m.innerHTML=`<div class="aveilot-md-box"><div>${image(p)}</div><div class="aveilot-md-body"><h2>${p.name||'AVEILOT Machine'}</h2><div class="aveilot-md-sub">${p.series||'PowerGen'} Series · ${p.code||''}</div><div class="aveilot-md-grid"><div class="aveilot-md-stat"><small>Rental fee</small><strong>${money(v.fee)}</strong></div><div class="aveilot-md-stat"><small>Duration</small><strong>${v.days} days</strong></div><div class="aveilot-md-stat daily"><small>Daily income</small><strong>${money(v.daily)}</strong></div><div class="aveilot-md-stat"><small>Total return</small><strong>${money(v.total)}</strong></div></div><div class="aveilot-md-actions"><button class="aveilot-md-close">Close</button><button class="aveilot-md-rent">Rent Machine</button></div><div class="aveilot-md-error" hidden></div></div></div>`;
    document.body.appendChild(m);
    m.onclick=e=>{if(e.target===m)close();};
    m.querySelector('.aveilot-md-close').onclick=close;
    m.querySelector('.aveilot-md-rent').onclick=async()=>{
      const b=m.querySelector('.aveilot-md-rent'), err=m.querySelector('.aveilot-md-error');
      if(!token()){close();if(typeof openModal==='function')openModal('login');return;}
      if(!confirm(`Confirm ${p.code||p.name}?\n\nRental fee: ${money(v.fee)}\nDaily income: ${money(v.daily)}\nTotal return: ${money(v.total)}\nDuration: ${v.days} days`))return;
      b.disabled=true;b.textContent='Starting...';err.hidden=true;
      try{
        const r=await fetch('/api/rentals',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({productId:Number(p.id)})});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.message||d.error||`Rental request failed (${r.status})`);
        alert(`Machine rented successfully.\n\nDaily income: ${money(v.daily)}\nTotal return: ${money(v.total)}`);
        close();location.reload();
      }catch(e){b.disabled=false;b.textContent='Rent Machine';err.hidden=false;err.textContent=e?.name==='TypeError'?'The rental server could not be reached. Please refresh and try again.':e.message;}
    };
  }

  document.addEventListener('click', async e=>{
    const target=e.target;
    const card=target.closest?.('.rental-product-card,[data-rent-product]');
    if(!card)return;

    e.preventDefault();
    e.stopImmediatePropagation();

    try {
      const list = await getProducts();
      const button = target.closest?.('[data-rent-product]');
      const id = card.dataset.rentProduct || card.dataset.machineId || button?.dataset.rentProduct || card.querySelector?.('[data-rent-product]')?.dataset.rentProduct;
      const p=list.find(item=>String(item.id)===String(id));
      if(!p) throw new Error('Unable to identify this machine. Please refresh and try again.');
      open(p);
    } catch (error) {
      const message = error?.name === 'AbortError' ? 'Machine details took too long to load. Please try again.' : (error?.message || 'Unable to open this machine.');
      alert(message);
    }
  },true);

  getProducts().catch(() => {});
})();
