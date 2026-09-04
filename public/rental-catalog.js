(() => {
  if (window.__casharrowRentalCatalog) return;
  window.__casharrowRentalCatalog = true;

  const SERIES = {A:{days:18,label:'Starter series'},B:{days:28,label:'Growth series'},C:{days:100,label:'Extended series'},D:{days:120,label:'Long-term series'}};
  const token=()=>localStorage.getItem('casharrowToken');
  const money=n=>`UGX ${Number(n||0).toLocaleString()}`;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  let products=[];

  function replaceBrand(value){return String(value||'').replace(/CashArrow/gi,'AVEILOT');}

  function applyAveilotBrand(root=document.body){
    document.title='AVEILOT · Build. Earn. Grow.';
    const title=document.querySelector('.hero .title');
    if(title && title.textContent!=='🚀 AVEILOT') title.textContent='🚀 AVEILOT';
    const welcome=document.querySelector('.hero .welcome');
    if(welcome){const next=replaceBrand(welcome.textContent);if(next!==welcome.textContent)welcome.textContent=next;}
    if(!root)return;
    const elements=root.querySelectorAll?.('*:not(script):not(style)')||[];
    elements.forEach(el=>{
      el.childNodes?.forEach(node=>{
        if(node.nodeType===Node.TEXT_NODE && /CashArrow/i.test(node.nodeValue)){
          const next=replaceBrand(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;
        }
      });
      ['title','aria-label','placeholder'].forEach(attr=>{
        if(el.hasAttribute?.(attr)){
          const current=el.getAttribute(attr),next=replaceBrand(current);
          if(next!==current)el.setAttribute(attr,next);
        }
      });
    });
  }

  function startBrandObserver(){
    applyAveilotBrand(document.body);
    if(window.__aveilotBrandObserver)return;
    let scheduled=false;
    const observer=new MutationObserver(mutations=>{
      if(scheduled)return;
      const relevant=mutations.some(m=>m.type==='childList'||m.type==='characterData'||m.type==='attributes');
      if(!relevant)return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        applyAveilotBrand(document.body);
      });
    });
    window.__aveilotBrandObserver=observer;
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']});
  }

  function css(){
    if(document.getElementById('casharrowRealPhotoCatalogStyle'))return;
    const s=document.createElement('style');s.id='casharrowRealPhotoCatalogStyle';s.textContent=`
      .ca-rental-catalog{background:#fff;border-radius:22px;padding:18px;margin:16px 0;box-shadow:0 8px 28px rgba(17,45,88,.08)}
      .ca-rental-head{margin-bottom:16px}.ca-rental-head h2{font-size:26px!important;color:#12213b!important;font-weight:900!important;margin:0}.ca-rental-head p{font-size:13px!important;color:#718096!important;margin-top:5px}
      .ca-series-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.ca-series-tab{border:1px solid #dce7f8;border-radius:14px;background:#f7faff;color:#0757e8;padding:12px 8px;font-weight:900;font-size:14px;min-height:55px;cursor:pointer}.ca-series-tab small{display:block;color:#718096;font-size:10px;margin-top:3px}.ca-series-tab.active{background:#0757e8;color:#fff}.ca-series-tab.active small{color:#dceaff}
      .ca-series-panel{display:none;margin-top:12px;background:#f7f9fd;border-radius:18px;padding:10px}.ca-series-panel.active{display:block}.ca-note{font-size:12px;color:#667085;padding:4px 4px 10px}
      .ca-product{display:grid;grid-template-columns:220px 1fr auto;gap:18px;align-items:center;padding:14px 4px;border-bottom:1px solid #e5eaf2}.ca-product:last-child{border-bottom:0}
      .ca-product-photo{width:220px;height:160px;border-radius:17px;overflow:hidden;background:#e9eef6;border:1px solid #d5dfed;display:flex;align-items:center;justify-content:center}.ca-product-photo img{width:100%;height:100%;object-fit:cover;display:block}.ca-photo-empty{font-size:12px;color:#7b8798;text-align:center;padding:15px}.ca-photo-empty strong{display:block;font-size:28px;margin-bottom:5px}
      .ca-product h3{font-size:22px!important;color:#172033!important;margin:0;font-weight:900}.ca-product p{font-size:14px!important;color:#667085!important;line-height:1.55;margin-top:7px}.ca-product-meta{min-width:135px;text-align:right}.ca-product-price{font-size:17px;font-weight:900;color:#0757e8}.ca-product-days{font-size:11px;color:#718096;margin-top:3px}.ca-buy{margin-top:10px;background:#0757e8;color:#fff;border:0;border-radius:12px;padding:12px 17px;min-height:48px;font-weight:900;font-size:14px;cursor:pointer}.ca-buy:disabled{background:#cbd5e1}
      .ca-modal{position:fixed;inset:0;z-index:9999;background:rgba(3,15,35,.78);display:flex;align-items:center;justify-content:center;padding:16px}.ca-modal-card{width:min(640px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:24px;padding:18px}.ca-detail-photo{height:320px;border-radius:18px;overflow:hidden;background:#e9eef6;margin:10px 0 14px}.ca-detail-photo img{width:100%;height:100%;object-fit:cover}.ca-modal-top{display:flex;justify-content:space-between;align-items:center}.ca-close{width:40px;height:40px;border:0;border-radius:50%;background:#eef2f7;font-size:24px}.ca-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ca-detail-box{background:#f6f8fc;border-radius:13px;padding:11px}.ca-detail-box span{display:block;color:#718096;font-size:10px}.ca-detail-box b{display:block;margin-top:4px;font-size:14px}.ca-modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.ca-modal-actions button{border:0;border-radius:12px;padding:13px;font-weight:900;font-size:14px}
      @media(max-width:600px){.ca-rental-catalog{padding:13px}.ca-series-tabs{grid-template-columns:repeat(2,1fr)}.ca-product{grid-template-columns:1fr;gap:10px;padding:13px 2px}.ca-product-photo{width:100%;height:190px}.ca-product h3{font-size:20px!important}.ca-product p{font-size:13px!important}.ca-product-meta{text-align:left;min-width:0}.ca-buy{width:100%;font-size:16px}.ca-detail-photo{height:240px}}
    `;document.head.appendChild(s);
  }

  function photo(p,large=false){
    const url=String(p.image_url||'').trim();
    if(!url)return `<div class="ca-photo-empty"><strong>📷</strong>Real machine photo not added yet</div>`;
    return `<img src="${esc(url)}" alt="${esc(p.name||p.code||'AVEILOT machine')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="ca-photo-empty" style="display:none"><strong>📷</strong>Photo unavailable</div>`;
  }

  async function api(path,opts={}){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const r=await fetch(path,{...opts,signal:controller.signal,headers:{...(opts.headers||{}),...(token()?{Authorization:`Bearer ${token()}`}:{})},cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(d.message||`Request failed (${r.status})`);
      return d;
    }catch(e){
      if(e?.name==='AbortError')throw Error('Machine catalog timed out. Please try again.');
      throw e;
    }finally{clearTimeout(timeout);}
  }

  async function buy(p,button){
    if(!token()){window.openModal?.('login');return;}
    if(!p.id){alert('This machine is not available yet.');return;}
    const fee=Number(p.rental_fee||0),days=Number(p.rental_days||0),ret=Number(p.return_amount||0);
    if(!confirm(`Buy ${String(p.code||'').toUpperCase()}?\n\nPrice: ${money(fee)}\nPeriod: ${days} days\nReturn credit: ${money(ret)}`))return;
    button.disabled=true;button.textContent='Processing...';
    try{const d=await api('/api/rentals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:p.id})});alert(d.message||'Machine purchased successfully.');window.loadWallet?.();window.dispatchEvent(new CustomEvent('casharrow:rentalPurchased'));}
    catch(e){alert(e.message||'Unable to purchase machine.');}
    finally{button.disabled=false;button.textContent='Buy Machine';}
  }

  function details(p){
    const m=document.createElement('div');m.className='ca-modal';const code=String(p.code||'').toUpperCase();
    m.innerHTML=`<div class="ca-modal-card"><div class="ca-modal-top"><h3>${esc(code)} · Machine</h3><button class="ca-close">×</button></div><div class="ca-detail-photo">${photo(p,true)}</div><div class="ca-detail-grid"><div class="ca-detail-box"><span>Purchase price</span><b>${money(p.rental_fee)}</b></div><div class="ca-detail-box"><span>Rental period</span><b>${Number(p.rental_days||0)} days</b></div><div class="ca-detail-box"><span>Return credit</span><b>${money(p.return_amount)}</b></div><div class="ca-detail-box"><span>Series</span><b>${esc(p.series||code.charAt(0))} Series</b></div></div><p style="font-size:12px;color:#718096;line-height:1.5;margin-top:12px">The photo shown here is the product image supplied by AVEILOT. No illustration is generated as a substitute.</p><div class="ca-modal-actions"><button class="ca-modal-cancel" style="background:#eef4ff;color:#0757e8">Close</button><button class="ca-modal-buy" style="background:#0757e8;color:#fff">${token()?'Buy Machine':'Login to Buy'}</button></div></div>`;
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector('.ca-close').onclick=close;m.querySelector('.ca-modal-cancel').onclick=close;m.querySelector('.ca-modal-buy').onclick=()=>{close();buy(p,m.querySelector('.ca-modal-buy'));};m.onclick=e=>{if(e.target===m)close();};
  }

  function render(host,open='A'){
    const groups={A:[],B:[],C:[],D:[]};products.forEach(p=>{const s=String(p.code||'').charAt(0).toUpperCase();if(groups[s])groups[s].push(p);});
    const list=groups[open]||[];
    host.innerHTML=`<div class="ca-rental-head"><h2>AVEILOT Machines</h2><p>Choose a series. Each product has its own photo and configuration.</p></div><div class="ca-series-tabs">${Object.entries(SERIES).map(([s,c])=>`<button class="ca-series-tab ${s===open?'active':''}" data-series="${s}">${s} Series<small>${c.days} days · ${groups[s].length} machines</small></button>`).join('')}</div><div class="ca-series-products"><div class="ca-series-panel active"><div class="ca-note">${SERIES[open].label} · ${SERIES[open].days}-day period</div>${list.length?list.map(p=>{const active=Number(p.active)===1||p.active===true;return `<article class="ca-product" data-id="${esc(p.id)}"><div class="ca-product-photo">${photo(p)}</div><div><h3>${esc(p.code||'Machine')}</h3><p>${esc(p.description||'AVEILOT rental product')}</p></div><div class="ca-product-meta"><div class="ca-product-price">${money(p.rental_fee)}</div><div class="ca-product-days">${Number(p.rental_days||0)} days</div><button class="ca-buy" ${active?'':'disabled'}>${active?(token()?'Buy Machine':'Login to Buy'):'Unavailable'}</button></div></article>`}).join(''):'<div class="ca-photo-empty">No products are configured for this series yet.</div>'}</div></div>`;
    host.querySelectorAll('[data-series]').forEach(b=>b.onclick=()=>render(host,b.dataset.series));
    host.querySelectorAll('.ca-product').forEach(row=>{const p=products.find(x=>String(x.id)===String(row.dataset.id));if(!p)return;row.querySelector('.ca-product-photo').onclick=()=>details(p);row.querySelector('h3').onclick=()=>details(p);const b=row.querySelector('.ca-buy');if(b&&!b.disabled)b.onclick=e=>{e.stopPropagation();buy(p,b)};});
    applyAveilotBrand(host);
  }

  async function openMachines(){
    applyAveilotBrand();
    css();
    let host=document.getElementById('casharrowRentalCatalog');
    if(!host){host=document.createElement('section');host.id='casharrowRentalCatalog';host.className='ca-rental-catalog';document.querySelector('main.container')?.appendChild(host);}
    host.style.display='block';host.innerHTML='<div class="ca-photo-empty">Loading products…</div>';
    try{const d=await api('/api/products');products=Array.isArray(d.products)?d.products:[];render(host,'A');}catch(e){host.innerHTML=`<div class="ca-photo-empty">Unable to load products. ${esc(e.message)}</div>`;}
  }

  window.cashArrowOpenMachines=openMachines;
  css();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startBrandObserver,{once:true});else startBrandObserver();
  if(token())document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('casharrowRentalCatalog'))document.getElementById('casharrowRentalCatalog').style.display='none';},{once:true});
})();
