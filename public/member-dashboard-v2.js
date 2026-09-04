(() => {
  if (window.__casharrowMemberDashboardV2) return;
  window.__casharrowMemberDashboardV2 = true;

  const token = () => localStorage.getItem('casharrowToken');
  const user = () => { try { return JSON.parse(localStorage.getItem('casharrowUser') || '{}'); } catch { return {}; } };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => `UGX ${Number(n || 0).toLocaleString()}`;

  const style = document.createElement('style');
  style.textContent = `
    body{background:#f4f7fb!important;color:#172033!important;padding-bottom:82px!important}
    .container{max-width:680px!important;padding:0 14px 96px!important}
    .ca2{display:block!important}
    .ca2hero{background:linear-gradient(145deg,#0757e8,#13a4ff);border-radius:24px;padding:20px;color:#fff;box-shadow:0 14px 35px rgba(7,87,232,.22);margin-bottom:14px}
    .ca2title{font-size:24px;font-weight:900}.ca2subtitle{font-size:13px;opacity:.82;margin-top:4px}.ca2label{font-size:12px;opacity:.8;margin-top:20px}.ca2bal{font-size:34px;font-weight:900;margin:4px 0 16px}
    .ca2quick{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ca2quick button,.ca2panel button{border:0;border-radius:13px;padding:13px;font-weight:900;font-size:14px;min-height:48px}.ca2quick button{background:#fff;color:#0757e8}.ca2quick button.secondary{background:#0b4dc8;color:#fff}
    .ca2panel{display:none;background:#fff;border:1px solid #e2e9f3;border-radius:20px;padding:17px;box-shadow:0 8px 24px rgba(17,45,88,.08);margin-bottom:14px}.ca2panel.open{display:block}.ca2panel h2{font-size:21px;margin:0 0 12px}.ca2back{float:right;background:#eef4ff!important;color:#0757e8!important;min-height:38px!important;padding:8px 12px!important;font-size:12px!important}.ca2row{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #edf1f6;font-size:13px}.ca2row:last-child{border-bottom:0}.ca2muted{font-size:12px;color:#718096;line-height:1.5}.ca2primary{background:#0757e8!important;color:#fff!important}.ca2cardgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ca2card{background:#f7f9fd;border:1px solid #e5ebf4;border-radius:15px;padding:13px}.ca2card span{display:block;color:#718096;font-size:11px}.ca2card b{display:block;font-size:16px;margin-top:5px}.ca2-machine{background:#f8faff;border:1px solid #e1e9f5;border-radius:17px;padding:13px;margin:9px 0}.ca2-machine-top{display:flex;justify-content:space-between;gap:10px}.ca2-machine-code{font-size:16px;font-weight:900}.ca2-status{font-size:10px;font-weight:900;border-radius:99px;padding:6px 9px;background:#e8f8f0;color:#087b48}.ca2-status.completed{background:#eaf2ff;color:#0757e8}.ca2-machine-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.ca2-machine-box{background:#fff;border-radius:10px;padding:8px}.ca2-machine-box span{display:block;color:#718096;font-size:9px}.ca2-machine-box b{display:block;font-size:11px;margin-top:3px}.ca2-empty{padding:20px;text-align:center;background:#f7f9fd;border:1px dashed #cfd9e8;border-radius:15px;color:#718096;font-size:13px;line-height:1.5}
    .ca-account-menu{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ca-account-menu button{background:#f7f9fd;color:#172033;border:1px solid #e2e9f3;text-align:left;min-height:62px}.ca-account-menu button span{display:block;font-size:12px;color:#718096;font-weight:600;margin-top:3px}
    .bottom{height:72px!important;background:#fff!important;border-top:1px solid #e6ebf2!important;box-shadow:0 -6px 20px rgba(0,0,0,.08)!important}
    .bottom .nav{font-size:11px!important;color:#718096!important;cursor:pointer;min-width:64px}.bottom .nav div{font-size:21px!important;margin-bottom:2px}.bottom .nav.active{color:#0757e8!important;font-weight:900}
    #rentalCatalog,#userWallet,#withdrawSection,#transactions,#memberTools,#todayTasks,#rewardsSection,#teamSection{display:none!important}
    @media(max-width:480px){.ca2hero{border-radius:20px;padding:17px}.ca2title{font-size:22px}.ca2bal{font-size:30px}.ca-account-menu{grid-template-columns:1fr 1fr}.ca2panel{padding:14px}}
  `;
  document.head.appendChild(style);

  let home, panel;
  const api = async (path, opts = {}) => {
    const r = await fetch(path, {...opts, headers:{...(opts.headers || {}), Authorization:`Bearer ${token()}`}, cache:'no-store'});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.message || 'Request failed');
    return d;
  };

  function hideLegacy(){
    ['rentalCatalog','userWallet','withdrawSection','transactions','memberTools','todayTasks','rewardsSection','teamSection','casharrowDynamicMemberProducts','casharrowMemberProducts','casharrowStaticRentals'].forEach(id=>document.getElementById(id)?.style.setProperty('display','none','important'));
    document.querySelectorAll('main.container>.cardbox').forEach(n=>n.style.setProperty('display','none','important'));
  }

  async function refreshBalance(){
    try{const d=await api('/api/wallet');const n=Number(d.wallet?.balance ?? d.balance ?? d.walletBalance ?? 0);const el=document.getElementById('ca2bal');if(el)el.textContent=money(n);}catch(_){ }
  }

  function closePanel(){if(panel){panel.classList.remove('open');panel.innerHTML='';}}
  function openPanel(title, html){panel.innerHTML=`<button class="ca2back">Home</button><h2>${title}</h2>${html}`;panel.classList.add('open');panel.querySelector('.ca2back').onclick=closePanel;panel.scrollIntoView({behavior:'smooth',block:'start'});}

  async function showAccount(){
    openPanel('👤 My Account', `<div class="ca2cardgrid"><div class="ca2card"><span>Account</span><b>${esc(user().name || user().phone || 'Member')}</b></div><div class="ca2card"><span>Balance</span><b id="caAccountBalance">Loading…</b></div></div><div class="ca-account-menu" style="margin-top:12px"><button data-account="machines">🏭 My Machines<span>Machines you have purchased</span></button><button data-account="tasks">🎯 Daily Tasks<span>Complete available tasks</span></button><button data-account="rewards">🎁 Rewards<span>View your rewards</span></button><button data-account="team">👥 My Team<span>Referral team and earnings</span></button><button data-account="transactions">🧾 Transactions<span>Wallet activity</span></button><button data-account="deposit">💳 Deposit<span>Add funds to your wallet</span></button><button data-account="withdraw">📤 Withdraw<span>Request a withdrawal</span></button></div>`);
    try{const d=await api('/api/wallet');const n=Number(d.wallet?.balance ?? d.balance ?? 0);const el=document.getElementById('caAccountBalance');if(el)el.textContent=money(n);}catch(_){ }
    panel.querySelectorAll('[data-account]').forEach(b=>b.onclick=()=>accountAction(b.dataset.account));
  }

  async function accountAction(k){
    if(k==='machines') return showMachines();
    if(k==='tasks') return showList('🎯 Daily Tasks','/api/tasks','tasks');
    if(k==='rewards') return showList('🎁 Rewards','/api/rewards','rewards');
    if(k==='transactions') return showTransactions();
    if(k==='team') return showTeam();
    if(k==='deposit'){closePanel();window.openDeposit?.();return;}
    if(k==='withdraw'){closePanel();window.openWithdraw?.();return;}
  }

  async function showMachines(){
    openPanel('🏭 My Machines','<div id="caBody" class="ca2-muted">Loading your machines…</div>');
    try{const d=await api('/api/rentals');const a=Array.isArray(d.rentals)?d.rentals:[];const body=document.getElementById('caBody');if(!a.length){body.innerHTML='<div class="ca2-empty">You do not own any machines yet.<br><br>Open <b>Machines</b> below to view available products.</div>';return;}body.innerHTML=a.map(x=>{const done=String(x.status||'').toLowerCase()==='completed';return `<div class="ca2-machine"><div class="ca2-machine-top"><div class="ca2-machine-code">${esc(x.code||'Machine')}</div><span class="ca2-status ${done?'completed':''}">${done?'Completed':'Active'}</span></div><div class="ca2-machine-grid"><div class="ca2-machine-box"><span>Purchase price</span><b>${money(x.rental_fee)}</b></div><div class="ca2-machine-box"><span>Rental period</span><b>${Number(x.rental_days||0)} days</b></div><div class="ca2-machine-box"><span>Start</span><b>${x.start_at?new Date(x.start_at).toLocaleDateString():'—'}</b></div><div class="ca2-machine-box"><span>End</span><b>${x.end_at?new Date(x.end_at).toLocaleDateString():'—'}</b></div></div></div>`}).join('');}catch(e){document.getElementById('caBody').textContent=e.message;}
  }

  async function showList(title,path,type){
    openPanel(title,'<div id="caBody" class="ca2-muted">Loading…</div>');
    try{
      const d=await api(path);const a=Array.isArray(d[type])?d[type]:[];const body=document.getElementById('caBody');
      if(!a.length){body.innerHTML='<div class="ca2-empty">Nothing available right now.</div>';return;}
      body.innerHTML=a.map(x=>{
        const isTask=type==='tasks';
        const claimed=isTask ? Number(x.done)===1 : Number(x.claimed)===1;
        const amount=Number(isTask ? x.reward : x.amount || 0);
        const action=claimed?'✅ Claimed':`<button class="ca2primary" data-claim="${esc(x.id)}">Claim</button>`;
        return `<div class="ca2row"><span>${esc(x.title||x.name||x.description||type)}<br><span class="ca2-muted">${money(amount)}</span></span>${action}</div>`;
      }).join('');
      body.querySelectorAll('[data-claim]').forEach(b=>b.onclick=async()=>{try{await api(`/api/${type}/${b.dataset.claim}/claim`,{method:'POST'});await refreshBalance();showList(title,path,type);}catch(e){alert(e.message)}});
    }catch(e){document.getElementById('caBody').textContent=e.message;}
  }

  async function showTransactions(){
    openPanel('🧾 Transactions','<div id="caBody" class="ca2-muted">Loading…</div>');
    try{const d=await api('/api/transactions');const a=Array.isArray(d.transactions)?d.transactions:[];document.getElementById('caBody').innerHTML=a.length?a.map(x=>`<div class="ca2row"><span>${esc(x.reference||x.type||'Transaction')}<br><span class="ca2-muted">${x.date?new Date(x.date).toLocaleString():''}</span></span><b>${money(x.amount)}</b></div>`).join(''):'<div class="ca2-empty">No transactions yet.</div>';}catch(e){document.getElementById('caBody').textContent=e.message;}
  }

  async function showTeam(){
    openPanel('👥 My Team','<div id="caBody" class="ca2-muted">Loading…</div>');
    try{const d=await api('/api/team');const a=Array.isArray(d.members)?d.members:[];const total=Number(d.totalEarn||0);document.getElementById('caBody').innerHTML=`<div class="ca2cardgrid"><div class="ca2card"><span>Team members</span><b>${Number(d.totalMembers ?? a.length)}</b></div><div class="ca2card"><span>Team earnings</span><b>${money(total)}</b></div></div>`+(a.length?a.map(x=>`<div class="ca2row"><span>${esc(x.member_name||'Member')}</span><b>${money(x.earn||0)}</b></div>`).join(''):'<div class="ca2-empty" style="margin-top:10px">No team members yet.</div>');}catch(e){document.getElementById('caBody').textContent=e.message;}
  }

  function showMachinesCatalog(){
    closePanel();
    window.cashArrowOpenMachines?.();
    const target=document.getElementById('casharrowRentalCatalog');
    if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.style.display='block';}
  }

  function setupNav(){
    const nav=document.querySelector('.bottom');if(!nav)return;
    const items=nav.querySelectorAll('.nav');
    const labels=[['🏠','Home'],['🏭','Machines'],['💰','Wallet'],['👤','My Account']];
    items.forEach((el,i)=>{if(i>3)return;el.innerHTML=`<div>${labels[i][0]}</div>${labels[i][1]}`;el.onclick=()=>{items.forEach(x=>x.classList.remove('active'));el.classList.add('active');if(i===0){closePanel();home?.scrollIntoView({behavior:'smooth',block:'start'});}if(i===1)showMachinesCatalog();if(i===2){closePanel();window.goToWallet?.();}if(i===3)showAccount();};});
  }

  function start(){
    if(!token()||home)return;
    const main=document.querySelector('main.container');if(!main)return;
    hideLegacy();
    home=document.createElement('section');home.id='casharrowCompactHome';home.className='ca2';
    home.innerHTML=`<div class="ca2hero"><div class="ca2title">🏹 CashArrow</div><div class="ca2subtitle">Welcome back, ${esc(user().name||user().phone||'Member')}</div><div class="ca2label">Available Balance</div><div class="ca2bal" id="ca2bal">UGX 0</div><div class="ca2quick"><button data-home="deposit">💳 Deposit</button><button class="secondary" data-home="withdraw">📤 Withdraw</button></div></div><div class="ca2panel" id="ca2panel"></div>`;
    main.prepend(home);panel=home.querySelector('#ca2panel');
    home.querySelector('[data-home="deposit"]').onclick=()=>{window.openDeposit?.();};home.querySelector('[data-home="withdraw"]').onclick=()=>{window.openWithdraw?.();};
    setupNav();refreshBalance();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.handleAccountAction=showAccount;
  window.cashArrowOpenMachines=showMachinesCatalog;
})();
