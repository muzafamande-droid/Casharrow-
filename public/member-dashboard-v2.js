(() => {
  if (window.__casharrowMemberDashboardV2) return;
  window.__casharrowMemberDashboardV2 = true;

  const token = () => localStorage.getItem('casharrowToken');
  const user = () => { try { return JSON.parse(localStorage.getItem('casharrowUser') || '{}'); } catch { return {}; } };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  const style = document.createElement('style');
  style.textContent = `
    body{background:#06142f!important;color:#fff!important}
    .container{max-width:560px!important;padding:10px 10px 88px!important}
    .ca2{display:none}.ca2hero{background:linear-gradient(145deg,#0d2b61,#0757e8);border-radius:18px;padding:14px}
    .ca2bal{font-size:27px;font-weight:900;margin:4px 0 11px}.ca2topgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}
    .ca2topgrid button,.ca2lowergrid button{min-height:42px;border:1px solid #8ab4ff22;border-radius:11px;background:#102b58;color:#fff;font-weight:800;font-size:11px;padding:7px 5px}
    .ca2topgrid button.p{background:#0757e8}.ca2lowergrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}.ca2lowergrid button{min-height:39px;background:#0d254c}
    .ca2panel{display:none;margin-top:9px;background:#0b2147;border:1px solid #78aaff2e;border-radius:16px;padding:11px}.ca2panel h3{margin:0 0 9px;font-size:15px}
    .ca2back{float:right;background:#17345f;color:#dce9ff;border:0;border-radius:8px;padding:5px 8px;font-size:11px}.ca2row{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #ffffff12;font-size:11px}
    .ca2primary{background:#0757e8;color:#fff;border:0;border-radius:9px;padding:8px 10px;font-weight:800;font-size:11px}.ca2rental{display:none}.ca2rental.open{display:block}
    .ca2rental .ca-rental-catalog{margin-top:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;border-radius:0!important}
    .ca2rental .ca-rental-head{display:block!important;margin-bottom:10px}.ca2rental .ca-rental-head h2{font-size:22px!important;color:#fff!important}.ca2rental .ca-rental-head p{font-size:12px!important;color:#9fb4d5!important}
    .ca2rental .ca-series-tabs{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:7px!important;padding:0 0 8px!important}
    .ca2rental .ca-series-tab{min-width:0!important;min-height:50px!important;border-radius:11px!important;padding:10px 7px!important;background:#102b58!important;color:#dce9ff!important;border:1px solid #8ab4ff22!important;font-size:12px!important;box-shadow:none!important}
    .ca2rental .ca-series-tab small{font-size:9px!important;color:#9fb4d5!important}.ca2rental .ca-series-tab.active{background:#0757e8!important;color:#fff!important}.ca2rental .ca-series-tab.active small{color:#dceaff!important}
    .ca2rental .ca-series-panel{background:#071a38!important;color:#fff!important;border-radius:13px!important;padding:8px!important;box-shadow:none!important}.ca2rental .ca-series-panel.active{display:block!important}
    .ca2rental .ca-product{display:grid!important;grid-template-columns:86px 1fr!important;gap:10px!important;align-items:center!important;padding:12px 2px!important;border-bottom:1px solid #ffffff12!important}
    .ca2rental .ca-product img{width:86px!important;height:86px!important;border-radius:15px!important;object-fit:cover!important}
    .ca2rental .ca-product h3{font-size:18px!important;color:#fff!important}.ca2rental .ca-product p{font-size:12px!important;line-height:1.45!important;color:#9fb4d5!important}
    .ca2rental .ca-product button{grid-column:1 / -1!important;width:100%!important;padding:10px 12px!important;border:0!important;background:#0757e8!important;color:#fff!important;border-radius:10px!important;font-size:16px!important;min-height:48px!important;font-weight:900!important}
    .ca2rental .ca-note{font-size:11px!important;color:#9fb4d5!important;margin:2px 0 7px!important}
    .ca2allnote{font-size:11px;color:#9fb4d5;margin:0 0 7px}
    @media(min-width:520px){.ca2rental .ca-series-tabs{grid-template-columns:repeat(4,1fr)!important}.ca2rental .ca-product{grid-template-columns:100px 1fr auto!important}.ca2rental .ca-product img{width:100px!important;height:100px!important}.ca2rental .ca-product button{grid-column:auto!important;width:auto!important;font-size:15px!important;min-height:50px!important}}
  `;
  document.head.appendChild(style);

  let home, panel, cat;

  function hideLegacy() {
    ['rentalCatalog','casharrowStaticRentals','casharrowDynamicMemberProducts','casharrowMemberProducts','memberTools','todayTasks','rewardsSection','teamSection','withdrawSection','transactions','casharrowDeposit','userWallet'].forEach(id => {
      const n = document.getElementById(id); if (n) n.style.display = 'none';
    });
    document.querySelectorAll('main.container>.cardbox').forEach(n => n.style.display = 'none');
  }

  function balance() {
    fetch('/api/wallet',{headers:{Authorization:'Bearer '+token()},cache:'no-store'}).then(r=>r.json()).then(d=>{
      const n=Number(d.balance??d.wallet?.balance??d.walletBalance??0); const x=document.getElementById('ca2bal'); if(x)x.textContent='UGX '+n.toLocaleString();
    }).catch(()=>{});
  }

  function closeOpenSections() {
    ['casharrowDeposit','withdrawSection','transactions','todayTasks','rewardsSection','teamSection','memberTools','rentalCatalog','casharrowStaticRentals','casharrowDynamicMemberProducts','casharrowMemberProducts'].forEach(id=>{
      const n=document.getElementById(id); if(n){n.style.display='none'; n.removeAttribute('data-cash-arrow-open');}
    });
    if(panel){panel.style.display='none';panel.innerHTML='';}
    document.querySelectorAll('.ca2rental').forEach(n=>n.remove());
  }

  function show(title, html='') {
    closeOpenSections();
    panel.style.display='block';
    panel.innerHTML='<button class="ca2back">Home</button><h3>'+title+'</h3>'+html;
    panel.querySelector('.ca2back').onclick=()=>closeOpenSections();
  }

  async function api(path, opts={}) {
    const r=await fetch(path,{...opts,headers:{...(opts.headers||{}),Authorization:'Bearer '+token()}});
    const d=await r.json().catch(()=>({})); if(!r.ok) throw Error(d.message||'Request failed'); return d;
  }

  function setupAllTab() {
    if(!cat)return;
    const tabs=cat.querySelector('.ca-series-tabs'),panels=cat.querySelector('.ca-series-products');
    if(!tabs||!panels||tabs.querySelector('[data-ca-all]'))return;
    const all=document.createElement('button'); all.className='ca-series-tab'; all.dataset.caAll='1'; all.innerHTML='All<small>20 products</small>'; tabs.insertBefore(all,tabs.firstChild);
    all.onclick=()=>{
      tabs.querySelectorAll('.ca-series-tab').forEach(x=>x.classList.remove('active'));all.classList.add('active');
      panels.querySelectorAll('.ca-series-panel').forEach(x=>x.classList.remove('active'));
      const rows=[];panels.querySelectorAll('.ca-product').forEach(row=>{const m=(row.querySelector('p')?.textContent||'').match(/Buy:\s*UGX\s*([\d,]+)/i);rows.push({row,fee:m?Number(m[1].replace(/,/g,'')):0});});rows.sort((a,b)=>a.fee-b.fee);
      let allPanel=panels.querySelector('.ca-all-panel');if(!allPanel){allPanel=document.createElement('div');allPanel.className='ca-series-panel ca-all-panel';panels.appendChild(allPanel)}
      allPanel.innerHTML='<div class="ca2allnote">Rental machines arranged by price · choose any available machine.</div>';
      rows.forEach(({row})=>{const copy=row.cloneNode(true);const old=copy.querySelector('button');if(old){const original=Array.from(panels.querySelectorAll('.ca-product button')).find(b=>b.textContent===old.textContent);old.onclick=original?.onclick||null;}allPanel.appendChild(copy);});allPanel.classList.add('active');
    };
    tabs.querySelectorAll('.ca-series-tab:not([data-ca-all])').forEach(tab=>tab.addEventListener('click',()=>all.classList.remove('active')));
  }

  async function feature(k) {
    if(k==='account'){closeOpenSections();window.handleAccountAction?.();return;}
    if(k==='deposit'){
      show('💳 Deposit');const n=document.getElementById('casharrowDeposit');if(window.openDeposit)window.openDeposit();if(n){panel.appendChild(n);n.style.display='block';n.dataset.cashArrowOpen='1';}return;
    }
    if(k==='withdraw'){
      show('📤 Withdraw');const n=document.getElementById('withdrawSection');if(window.openWithdraw)window.openWithdraw();if(n){panel.appendChild(n);n.style.display='block';n.dataset.cashArrowOpen='1';}return;
    }
    if(k==='rentals'){
      show('🏹 Rental Machines');cat=document.getElementById('casharrowRentalCatalog');
      if(cat){const box=document.createElement('div');box.className='ca2rental open';panel.appendChild(box);box.appendChild(cat);cat.style.display='block';setupAllTab();}return;
    }
    if(k==='transactions'){
      show('🧾 Transactions','<div id="ca2body">Loading...</div>');try{const d=await api('/api/transactions'),a=d.transactions||d.data||[];document.getElementById('ca2body').innerHTML=a.length?a.map(x=>`<div class="ca2row"><span>${esc(x.description||x.type||'Transaction')}</span><b>UGX ${Number(x.amount||0).toLocaleString()}</b></div>`).join(''):'No transactions yet.';}catch{document.getElementById('ca2body').textContent='Unable to load transactions.'}return;
    }
    if(k==='tasks'){
      show('🎯 Tasks','<div id="ca2body">Loading...</div>');try{const d=await api('/api/tasks'),a=d.tasks||[];document.getElementById('ca2body').innerHTML=a.map(x=>`<div class="ca2row"><span>${esc(x.title||x.name)}<br>UGX ${Number(x.reward||x.reward_amount||0).toLocaleString()}</span>${x.claimed?'✅':`<button class="ca2primary" data-id="${x.id}">Claim</button>`}</div>`).join('')||'No tasks available.';panel.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{try{await api('/api/tasks/'+b.dataset.id+'/claim',{method:'POST'});balance();feature('tasks')}catch(x){alert(x.message)}})}catch{document.getElementById('ca2body').textContent='Unable to load tasks.'}return;
    }
    if(k==='rewards'){
      show('🎁 Rewards','<div id="ca2body">Loading...</div>');try{const d=await api('/api/rewards'),a=d.rewards||[];document.getElementById('ca2body').innerHTML=a.map(x=>`<div class="ca2row"><span>${esc(x.title||x.name)}<br>UGX ${Number(x.amount||x.reward||0).toLocaleString()}</span>${x.claimed?'✅':`<button class="ca2primary" data-id="${x.id}">Claim</button>`}</div>`).join('')||'No rewards available.';panel.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{try{await api('/api/rewards/'+b.dataset.id+'/claim',{method:'POST'});balance();feature('rewards')}catch(x){alert(x.message)}})}catch{document.getElementById('ca2body').textContent='Unable to load rewards.'}return;
    }
    if(k==='team'){
      show('👥 My Team','<div id="ca2body">Loading...</div>');try{const d=await api('/api/team'),a=d.team||d.members||[];document.getElementById('ca2body').innerHTML='<div class="ca2row"><span>Total team members</span><b>'+a.length+'</b></div>'+(a.map(x=>`<div class="ca2row"><span>${esc(x.name||x.phone||'Member')}</span><span>UGX ${Number(x.earnings||x.total_earnings||0).toLocaleString()}</span></div>`).join('')||'<p>No team members yet.</p>')}catch{document.getElementById('ca2body').textContent='Unable to load team.'}return;
    }
    if(k==='invite'){
      const x=user(),c=x.referralCode||x.referral_code||'',l=c?location.origin+'/?ref='+encodeURIComponent(c):'';
      show('👥 Invite Friends',`<div class="ca2row"><span>Referral code</span><b>${esc(c||'Loading...')}</b></div><p>Share your referral link.</p><button class="ca2primary" id="ca2copy">Copy invite link</button>`);
      panel.querySelector('#ca2copy').onclick=async()=>{try{await navigator.clipboard.writeText(l);alert('Copied!')}catch{prompt('Copy link:',l)}};return;
    }
  }

  function start(){
    if(!token()||home)return;const main=document.querySelector('main.container');if(!main)return;hideLegacy();
    home=document.createElement('section');home.id='casharrowCompactHome';home.className='ca2';
    home.innerHTML=`<div class="ca2hero"><div style="color:#bcd0f0;font-size:11px">Welcome back, <b>${esc(user().name||user().phone||'Member')}</b> 👋</div><div style="color:#bcd0f0;font-size:11px;margin-top:10px">💰 Available Balance</div><div class="ca2bal" id="ca2bal">UGX 0</div><div class="ca2topgrid"><button class="p" data-k="deposit">💳 Deposit</button><button data-k="withdraw">📤 Withdraw</button></div><div class="ca2lowergrid"><button data-k="rentals">🏭 Machines</button><button data-k="transactions">🧾 Transactions</button><button data-k="tasks">🎯 Tasks</button><button data-k="invite">👥 Invite</button><button data-k="rewards">🎁 Rewards</button><button data-k="team">👥 Team</button><button data-k="account">👤 Account</button></div></div><div class="ca2panel" id="ca2panel"></div>`;
    main.prepend(home);panel=home.querySelector('#ca2panel');home.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>feature(b.dataset.k));home.style.display='block';balance();
    const observer=new MutationObserver(()=>{if(!cat){const n=document.getElementById('casharrowRentalCatalog');if(n)cat=n;}});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),20000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();window.cashArrowCompactHome=start;
})();