(() => {
  if (window.__casharrowUiFixes) return;
  window.__casharrowUiFixes = true;

  const css = document.createElement('style');
  css.textContent = `
    body { font-size:16px!important; }
    button, .btn, a.btn, input, select { font-size:16px!important; min-height:46px; }
    .ca-rental-catalog{background:#0b2147!important;color:#fff!important;border:1px solid #78aaff2e!important;border-radius:20px!important;padding:16px!important;margin-top:14px!important}
    .ca-rental-catalog .ca-rental-head h2{font-size:25px!important;color:#fff!important;font-weight:900!important}
    .ca-rental-catalog .ca-rental-head p{font-size:15px!important;color:#c7d6ed!important}
    .ca-rental-catalog .ca-series-tabs{display:flex!important;overflow-x:auto!important;gap:9px!important;scrollbar-width:none!important}
    .ca-rental-catalog .ca-series-tabs::-webkit-scrollbar{display:none}
    .ca-rental-catalog .ca-series-tab{flex:0 0 auto!important;min-width:92px!important;background:#102b58!important;color:#dce9ff!important;border:1px solid #8ab4ff22!important;border-radius:12px!important;padding:11px 13px!important;font-size:15px!important;box-shadow:none!important}
    .ca-rental-catalog .ca-series-tab.active{background:#0757e8!important;color:#fff!important}
    .ca-rental-catalog .ca-series-tab small{font-size:12px!important;color:#b7c9e5!important}
    .ca-rental-catalog .ca-series-panel{background:#071a38!important;color:#fff!important;border-radius:14px!important;padding:13px!important;box-shadow:none!important}
    .ca-rental-catalog .ca-product{grid-template-columns:88px 1fr auto!important;gap:14px!important;padding:16px 2px!important;align-items:center!important}
    .ca-rental-catalog .ca-product img{width:88px!important;height:88px!important;border-radius:18px!important;object-fit:cover!important;background:#102b58!important}
    .ca-rental-catalog .ca-product h3{font-size:21px!important;color:#fff!important;margin:0!important;font-weight:900!important}
    .ca-rental-catalog .ca-product p{font-size:15px!important;line-height:1.5!important;color:#c6d5eb!important;margin-top:6px!important}
    .ca-rental-catalog .ca-product button{padding:11px 18px!important;border-radius:11px!important;font-size:18px!important;font-weight:900!important;min-height:52px!important;background:#0757e8!important;color:#fff!important}
    .ca-rental-catalog .ca-note{font-size:14px!important;color:#b7c9e5!important}
    .ca-machine-buy{font-size:18px!important;font-weight:900!important;min-height:52px!important;padding:12px 18px!important}
    .ca2-machine-card{background:#0b2147;border:1px solid #78aaff2e;border-radius:15px;padding:12px;margin:8px 0;box-shadow:0 8px 22px #0002}
    .ca2-machine-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .ca2-machine-code{font-size:19px;font-weight:900;color:#fff}
    .ca2-machine-status{font-size:11px;font-weight:900;border-radius:999px;padding:6px 9px;background:#14532d;color:#bbf7d0}
    .ca2-machine-status.completed{background:#1e3a8a;color:#bfdbfe}
    .ca2-machine-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
    .ca2-machine-box{background:#071a38;border-radius:10px;padding:8px}
    .ca2-machine-box span{display:block;color:#8fa8cc;font-size:9px}
    .ca2-machine-box b{display:block;color:#fff;font-size:12px;margin-top:3px}
    .ca2-machine-empty{background:#071a38;border:1px dashed #78aaff44;border-radius:14px;padding:18px;text-align:center;color:#9fb4d5;font-size:12px;line-height:1.5}
    .ca2-machine-refresh{float:right;background:#17345f;color:#dce9ff;border:0;border-radius:8px;padding:6px 9px;font-size:11px;min-height:34px}

    .modal{backdrop-filter:blur(6px)!important;background:#06142fd9!important;padding:16px!important}
    .modalbox{max-height:92vh!important;overflow:auto!important;border-radius:24px!important;padding:28px 22px 22px!important;box-shadow:0 24px 70px #0008!important;border:1px solid #e5eaf2!important}
    .modalbox h2{font-size:27px!important;color:#12213b!important;margin-bottom:7px!important;font-weight:900!important}
    .modalbox .small{font-size:14px!important;line-height:1.45!important}
    .modalbox input{height:52px!important;min-height:52px!important;margin:7px 0!important;padding:0 15px!important;border:1px solid #cfd8e6!important;border-radius:13px!important;background:#f9fbfe!important;color:#172033!important}
    .modalbox input:focus{outline:3px solid #0757e81f!important;border-color:#0757e8!important;background:#fff!important}
    .modalbox .primary{height:54px!important;min-height:54px!important;border-radius:13px!important;font-size:17px!important;font-weight:900!important;box-shadow:0 8px 18px #0757e82e!important}
    .modalbox .close{width:40px!important;height:40px!important;border-radius:50%!important;font-size:24px!important;background:#eef2f7!important;color:#344054!important}
    .ca-auth-switch{text-align:center!important;margin-top:16px!important;font-size:14px!important;color:#667085!important}
    .ca-auth-switch b{color:#0757e8!important;cursor:pointer!important}
    .ca-auth-heading{display:inline-flex;align-items:center;gap:7px;margin-bottom:2px}
    .ca-auth-subtitle{margin-bottom:12px!important;color:#667085!important}
    .ca-auth-phone-note{font-size:12px!important;color:#7b8494!important;margin:-2px 0 7px!important}
    .ca-password-wrap{position:relative!important}
    .ca-password-wrap input{padding-right:82px!important}
    .ca-password-toggle{position:absolute!important;right:7px!important;top:7px!important;height:38px!important;min-height:38px!important;padding:5px 10px!important;border-radius:9px!important;background:#eef4ff!important;color:#0757e8!important;font-size:12px!important;font-weight:800!important}
    .ca-auth-footer{margin-top:20px!important;padding-top:15px!important;border-top:1px solid #edf1f6!important;text-align:center!important}
    .ca-auth-footer strong{display:block!important;font-size:14px!important;margin-bottom:4px!important;color:#172033!important}
    .ca-auth-footer span{font-size:12px!important;color:#718096!important}
    .ca-referral-wrap{margin:9px 0 3px!important}
    .ca-referral-label{display:block!important;font-size:14px!important;color:#475467!important;margin:3px 0 5px!important;font-weight:700!important}
    .ca-referral-note{font-size:12px!important;color:#718096!important;line-height:1.4!important;margin:4px 0 0!important}
    .msg{font-size:14px!important;line-height:1.4!important}
    .ca-notice{position:fixed;left:14px;right:14px;top:76px;z-index:80;max-width:520px;margin:auto;background:#fff;border:1px solid #dce7f8;border-radius:18px;box-shadow:0 12px 35px #0002;padding:18px 48px 18px 18px}
    .ca-notice h3{font-size:19px;margin-bottom:6px}.ca-notice p{font-size:14px;line-height:1.5;color:#5f6b7a}.ca-notice button{position:absolute;right:9px;top:9px;width:36px;height:36px;padding:0;background:#eef2f7;font-size:22px;line-height:1}.ca-notice .ca-notice-action{position:static;width:auto;height:auto;margin-top:12px;padding:10px 14px;background:#0757e8;color:#fff;font-size:16px;font-weight:800}
    body.ca-auth-open .bottom{opacity:0!important;pointer-events:none!important}
    @media(max-width:560px){.ca-rental-catalog .ca-product{grid-template-columns:76px 1fr!important}.ca-rental-catalog .ca-product img{width:76px!important;height:76px!important}.ca-rental-catalog .ca-product button{grid-column:1 / -1!important;width:100%!important;margin-top:2px!important}}
    @media(max-width:480px){.ca-rental-catalog .ca-product h3{font-size:20px!important}.ca-rental-catalog .ca-product p{font-size:14px!important}.modalbox{padding:26px 18px 20px!important}.modalbox h2{font-size:25px!important}.ca-notice{top:68px}}
  `;
  document.head.appendChild(css);

  function preserveMovedSections() {
    const main=document.querySelector('main.container'),panel=document.getElementById('ca2panel');
    if(!main||!panel)return;
    ['casharrowDeposit','withdrawSection','casharrowRentalCatalog'].forEach(id=>{const n=document.getElementById(id);if(n&&panel.contains(n)){main.appendChild(n);n.style.display='none';n.removeAttribute('data-cash-arrow-open')}});
  }

  function polishAuthForm(form,type){
    if(!form||form.dataset.caAuthPolished)return;form.dataset.caAuthPolished='1';
    const heading=form.querySelector('h2');if(heading)heading.classList.add('ca-auth-heading');
    const subtitle=heading?.nextElementSibling;if(subtitle)subtitle.classList.add('ca-auth-subtitle');
    const phone=type==='login'?document.getElementById('loginPhone'):document.getElementById('registerPhone');
    if(phone){phone.setAttribute('inputmode','tel');phone.setAttribute('autocomplete','tel');phone.placeholder='Phone number (e.g. 07XXXXXXXX)';if(!phone.nextElementSibling?.classList.contains('ca-auth-phone-note')){const note=document.createElement('div');note.className='ca-auth-phone-note';note.textContent='Uganda mobile number';phone.insertAdjacentElement('afterend',note)}}
    const password=type==='login'?document.getElementById('loginPassword'):document.getElementById('registerPassword');
    if(password&&!password.parentElement.classList.contains('ca-password-wrap')){const wrap=document.createElement('div');wrap.className='ca-password-wrap';password.parentNode.insertBefore(wrap,password);wrap.appendChild(password);const toggle=document.createElement('button');toggle.type='button';toggle.className='ca-password-toggle';toggle.textContent='Show';toggle.onclick=()=>{const shown=password.type==='text';password.type=shown?'password':'text';toggle.textContent=shown?'Show':'Hide'};wrap.appendChild(toggle)}
  }

  function installAuthPolish(){
    const modal=document.getElementById('modal');if(!modal||modal.dataset.caPolished)return;modal.dataset.caPolished='1';
    const sync=()=>document.body.classList.toggle('ca-auth-open',modal.style.display==='flex');new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['style']});
    polishAuthForm(document.getElementById('loginForm'),'login');polishAuthForm(document.getElementById('registerForm'),'register');
    const box=modal.querySelector('.modalbox');if(box&&!box.querySelector('.ca-auth-footer')){const footer=document.createElement('div');footer.className='ca-auth-footer';footer.innerHTML='<strong>🏹 CashArrow</strong><span>Secure account access · UGX wallet</span>';box.appendChild(footer)}
  }

  function installReferralSignup(){
    const form=document.getElementById('registerForm');if(!form||form.dataset.caReferralReady)return;form.dataset.caReferralReady='1';const password=document.getElementById('registerPassword');if(!password)return;
    const wrap=document.createElement('div');wrap.className='ca-referral-wrap';wrap.innerHTML='<label class="ca-referral-label" for="casharrowReferralCode">Referral code <span>(optional)</span></label><input id="casharrowReferralCode" placeholder="Enter referral code"><div class="ca-referral-note">Use a friend\'s link or code when signing up.</div>';
    password.closest('.ca-password-wrap')?.insertAdjacentElement('afterend',wrap)||password.insertAdjacentElement('afterend',wrap);let code='';
    try{const urlCode=new URLSearchParams(location.search).get('ref');code=urlCode||sessionStorage.getItem('casharrowPendingReferral')||'';if(urlCode)sessionStorage.setItem('casharrowPendingReferral',urlCode.toUpperCase())}catch(e){}
    const input=document.getElementById('casharrowReferralCode');if(code)input.value=code.toUpperCase();
  }

  function installReferralFetchBridge(){
    if(window.__casharrowReferralFetchBridge)return;window.__casharrowReferralFetchBridge=true;const originalFetch=window.fetch;
    window.fetch=async function(input,init){const url=typeof input==='string'?input:(input&&input.url)||'';if(url.includes('/api/register')&&init&&typeof init.body==='string'){try{const payload=JSON.parse(init.body),referral=document.getElementById('casharrowReferralCode'),code=referral&&referral.value.trim().toUpperCase();if(code){payload.referralCode=code;sessionStorage.removeItem('casharrowPendingReferral');init={...init,body:JSON.stringify(payload)}}}catch(e){}}return originalFetch.call(this,input,init)};
  }

  function installVisitorNotice(){
    if(localStorage.getItem('casharrowWelcomeNoticeDismissed')||localStorage.getItem('casharrowToken')||document.querySelector('.ca-notice'))return;
    const notice=document.createElement('div');notice.className='ca-notice';notice.innerHTML='<button type="button" aria-label="Close">×</button><h3>🏹 Welcome to CashArrow</h3><p>Explore our machines, create your account, and start your CashArrow journey.</p><button type="button" class="ca-notice-action">Create Account</button>';document.body.appendChild(notice);
    const close=()=>{localStorage.setItem('casharrowWelcomeNoticeDismissed','1');notice.remove()};notice.querySelector('button').onclick=close;notice.querySelector('.ca-notice-action').onclick=()=>{close();if(typeof openModal==='function')openModal('register')};
  }

  function replaceMachineLabels(){document.querySelectorAll('button,a,[role="button"]').forEach(el=>{const label=(el.textContent||'').trim().toLowerCase();if(/^rent( machine)?$/.test(label)){el.textContent='Buy';el.classList.add('ca-machine-buy')}})}

  function formatDate(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString()}
  async function loadMyMachines(target){
    target.innerHTML='<div class="ca2-machine-empty">Loading your machines…</div>';
    try{
      const token=localStorage.getItem('casharrowToken');
      const r=await fetch('/api/rentals',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(d.message||'Unable to load machines');
      const rentals=Array.isArray(d.rentals)?d.rentals:[];
      if(!rentals.length){target.innerHTML='<div class="ca2-machine-empty">🏭 You have no machines yet.<br>Open <b>CashArrow Machines</b> and buy your first machine.</div>';return}
      target.innerHTML=rentals.map(x=>{
        const status=String(x.status||'active').toLowerCase(),completed=status==='completed';
        return `<div class="ca2-machine-card"><div class="ca2-machine-top"><div class="ca2-machine-code">🏭 ${String(x.code||'Machine')}</div><span class="ca2-machine-status ${completed?'completed':''}">${completed?'Completed':'Active'}</span></div><div class="ca2-machine-grid"><div class="ca2-machine-box"><span>Purchase price</span><b>UGX ${Number(x.rental_fee||0).toLocaleString()}</b></div><div class="ca2-machine-box"><span>Rental period</span><b>${Number(x.rental_days||0)} days</b></div><div class="ca2-machine-box"><span>Opening date</span><b>${formatDate(x.start_at)}</b></div><div class="ca2-machine-box"><span>Closing date</span><b>${formatDate(x.end_at)}</b></div></div></div>`;
      }).join('');
    }catch(e){target.innerHTML='<div class="ca2-machine-empty">Unable to load your machines right now.<br>Please try again.</div>'}
  }

  function installMyMachines(){
    const home=document.getElementById('casharrowCompactHome');if(!home||home.dataset.caMyMachines)return;home.dataset.caMyMachines='1';
    const grid=home.querySelector('.ca2lowergrid');if(!grid)return;
    const btn=document.createElement('button');btn.type='button';btn.innerHTML='🧰 My Machines';grid.insertBefore(btn,grid.firstChild);
    btn.onclick=()=>{
      const panel=document.getElementById('ca2panel');if(!panel)return;
      document.querySelectorAll('#casharrowCompactHome .ca2panel').forEach(x=>{if(x!==panel)x.style.display='none'});
      panel.style.display='block';panel.innerHTML='<button class="ca2back">Home</button><button class="ca2-machine-refresh">↻ Refresh</button><h3>🧰 My Machines</h3><div id="ca2MyMachines"></div>';
      panel.querySelector('.ca2back').onclick=()=>{panel.style.display='none';panel.innerHTML=''};
      const target=panel.querySelector('#ca2MyMachines');panel.querySelector('.ca2-machine-refresh').onclick=()=>loadMyMachines(target);loadMyMachines(target);
    };
  }

  function watchDashboard(){
    document.addEventListener('click',event=>{const b=event.target.closest('#casharrowCompactHome [data-k]');if(b)preserveMovedSections()},true);
    const observer=new MutationObserver(()=>{replaceMachineLabels();installMyMachines()});observer.observe(document.body,{childList:true,subtree:true});installMyMachines();
  }

  function boot(){installAuthPolish();installReferralSignup();installReferralFetchBridge();installVisitorNotice();replaceMachineLabels();watchDashboard()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();