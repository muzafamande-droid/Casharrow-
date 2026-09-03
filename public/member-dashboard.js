(() => {
  if (window.__casharrowMemberDashboard) return;
  window.__casharrowMemberDashboard = true;

  const token = () => localStorage.getItem('casharrowToken');
  const user = () => { try { return JSON.parse(localStorage.getItem('casharrowUser') || '{}') || {}; } catch { return {}; } };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const style = document.createElement('style');
  style.id = 'casharrowCompactDashboardStyle';
  style.textContent = `
    body{background:#06142f!important;color:#f5f8ff!important}
    body .container{max-width:560px!important;padding:12px 12px 88px!important}
    body .container>.cardbox,body .container>.balance,body .container>.section{background:#0b2147!important;border:1px solid rgba(120,170,255,.18)!important;color:#f5f8ff!important;box-shadow:0 10px 28px rgba(0,0,0,.2)!important}
    body .container .small,body .container p{color:#a9b8d0!important}
    #casharrowCompactHome{display:none;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important}
    .ca-wallet-hero{background:linear-gradient(145deg,#0d2b61,#0757e8)!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:20px;padding:18px!important;box-shadow:0 14px 35px rgba(0,0,0,.28)!important}
    .ca-wallet-hero .small{color:#bcd0f0!important}.ca-wallet-hero .amount{font-size:30px!important;font-weight:900!important;color:#fff!important;margin:5px 0 2px!important}
    .ca-action-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}
    .ca-action-grid button{border:1px solid rgba(130,180,255,.2);background:#102b58;color:#fff;border-radius:13px;padding:11px 7px;font-weight:800;font-size:12px;min-height:48px;box-shadow:none}
    .ca-action-grid button.primary{background:#0757e8}.ca-action-grid button:active{transform:scale(.98)}
    .ca-panel{display:none;margin-top:10px;background:#0b2147!important;border:1px solid rgba(120,170,255,.18)!important;border-radius:18px;padding:13px!important;box-shadow:0 10px 28px rgba(0,0,0,.22)!important;color:#fff!important}
    .ca-panel h3{margin:0 0 10px;font-size:16px}.ca-panel .ca-back{float:right;border:0;background:#17345f;color:#cfe0ff;border-radius:9px;padding:6px 9px;font-size:11px}
    .ca-list-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px}.ca-list-row:last-child{border-bottom:0}
    .ca-panel input,.ca-panel select{width:100%;background:#071a38!important;color:#fff!important;border:1px solid rgba(140,180,240,.2)!important;border-radius:10px;padding:10px;margin:5px 0}
    .ca-panel button.ca-primary{background:#0757e8;color:#fff;border:0;border-radius:10px;padding:9px 12px;font-weight:800}
    .ca-panel button.ca-secondary{background:#17345f;color:#dce9ff;border:0;border-radius:10px;padding:9px 12px;font-weight:800}
    #casharrowCompactHome .ca-rental-wrap{display:none}
    #casharrowCompactHome .ca-rental-wrap.open{display:block}
    #casharrowCompactHome .ca-rental-catalog{margin:0!important}
    #casharrowCompactHome .ca-rental-head{display:none!important}
    #casharrowCompactHome .ca-series-tabs{display:flex!important;overflow-x:auto!important;gap:7px!important;padding:2px 1px 9px!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch}
    #casharrowCompactHome .ca-series-tabs::-webkit-scrollbar{display:none}
    #casharrowCompactHome .ca-series-tab{flex:0 0 auto!important;min-width:88px!important;background:#102b58!important;color:#dce9ff!important;border:1px solid rgba(130,180,255,.18)!important;border-radius:12px!important;padding:9px 11px!important;font-size:12px!important;box-shadow:none!important}
    #casharrowCompactHome .ca-series-tab.active{background:#0757e8!important;color:#fff!important}
    #casharrowCompactHome .ca-series-products{margin-top:3px!important}
    #casharrowCompactHome .ca-series-panel{background:#071a38!important;border:1px solid rgba(130,180,255,.12)!important;border-radius:13px!important;color:#fff!important}
    #casharrowCompactHome .ca-product{border-bottom:1px solid rgba(255,255,255,.08)!important}
    #casharrowCompactHome .ca-product h3{color:#fff!important}
    #casharrowCompactHome .ca-product p,#casharrowCompactHome .ca-note{color:#9fb2d0!important}
    #casharrowCompactHome .ca-my-rentals{display:none!important}
    @media(max-width:430px){.ca-action-grid{grid-template-columns:repeat(2,1fr)}.ca-action-grid button{font-size:11px;padding:9px 4px}}
  `;
  document.head.appendChild(style);

  let panel, home;

  function hideLegacy() {
    ['rentalCatalog','casharrowStaticRentals','casharrowDynamicMemberProducts','casharrowMemberProducts','memberTools','todayTasks','rewardsSection','teamSection','withdrawSection','transactions','casharrowDeposit'].forEach(id => {
      const n = document.getElementById(id); if (n) n.style.display = 'none';
    });
    document.querySelectorAll('main.container>.cardbox').forEach(n => {
      if (n.id !== 'userWallet') n.style.display = 'none';
    });
    const wallet = document.getElementById('userWallet');
    if (wallet) wallet.style.display = 'none';
  }

  function ensureHome() {
    if (!token()) return;
    if (home) return;
    const main = document.querySelector('main.container');
    const wallet = document.getElementById('userWallet');
    if (!main || !wallet) return;
    hideLegacy();

    home = document.createElement('section');
    home.id = 'casharrowCompactHome';
    home.innerHTML = `
      <div class="ca-wallet-hero">
        <div class="small">Welcome back, <b>${esc(user().name || user().phone || 'Member')}</b> 👋</div>
        <div class="small" style="margin-top:12px">💰 Available Balance</div>
        <div class="amount" id="caCompactBalance">UGX 0</div>
        <div class="ca-action-grid">
          <button class="primary" data-ca="deposit">💳 Deposit</button>
          <button data-ca="withdraw">📤 Withdraw</button>
          <button data-ca="transactions">🧾 Transactions</button>
          <button data-ca="rentals">🏹 Rentals</button>
          <button data-ca="tasks">🎯 Tasks</button>
          <button data-ca="invite">👥 Invite Friends</button>
          <button data-ca="rewards">🎁 Rewards</button>
          <button data-ca="team">👥 My Team</button>
          <button data-ca="account">👤 Account</button>
        </div>
      </div>
      <div class="ca-panel" id="caCompactPanel"></div>`;
    main.insertBefore(home, main.firstChild);
    panel = home.querySelector('#caCompactPanel');
    home.querySelectorAll('[data-ca]').forEach(b => b.addEventListener('click', () => openFeature(b.dataset.ca)));
    home.style.display = 'block';
    syncBalance();
    setupRentalMount();
  }

  async function syncBalance() {
    try {
      const r = await fetch('/api/wallet', {headers:{Authorization:'Bearer '+token()}, cache:'no-store'});
      const d = await r.json().catch(()=>({}));
      const balance = Number(d.balance ?? d.wallet?.balance ?? d.walletBalance ?? 0);
      const el = document.getElementById('caCompactBalance');
      if (el) el.textContent = 'UGX ' + balance.toLocaleString();
    } catch (_) {}
  }

  function showPanel(title, html='') {
    panel.style.display = 'block';
    panel.innerHTML = `<button class="ca-back" type="button">Home</button><h3>${title}</h3>${html}`;
    panel.querySelector('.ca-back').onclick = () => { panel.style.display='none'; panel.innerHTML=''; };
  }

  function openFeature(kind) {
    if (!token()) { if(window.openModal) window.openModal('login'); return; }
    if (kind === 'deposit') { if(window.openDeposit) window.openDeposit(); const n=document.getElementById('casharrowDeposit'); if(n){n.style.display='block'; panel.innerHTML=''; panel.appendChild(n); panel.style.display='block';} return; }
    if (kind === 'withdraw') { if(window.openWithdraw) window.openWithdraw(); const n=document.getElementById('withdrawSection'); if(n){n.style.display='block';panel.style.display='block';panel.innerHTML='';panel.appendChild(n);} return; }
    if (kind === 'transactions') { showPanel('🧾 Transactions','<div id="caTransactionsBody">Loading transactions...</div>'); loadTransactionsPanel(); return; }
    if (kind === 'tasks') { showPanel('🎯 Tasks','<div id="caTasksBody">Loading tasks...</div>'); loadTasks(); return; }
    if (kind === 'rewards') { showPanel('🎁 Rewards','<div id="caRewardsBody">Loading rewards...</div>'); loadRewards(); return; }
    if (kind === 'team') { showPanel('👥 My Team','<div id="caTeamBody">Loading team...</div>'); loadTeam(); return; }
    if (kind === 'invite') { const code=user().referralCode || user().referral_code || ''; const link=code ? location.origin+'/?ref='+encodeURIComponent(code) : ''; showPanel('👥 Invite Friends',`<div class="ca-list-row"><span>Referral code</span><b>${esc(code||'Loading...')}</b></div><p style="font-size:12px;margin:8px 0;color:#a9b8d0!important">Share your referral link with friends.</p><button class="ca-primary" id="caCopyInvite">Copy invite link</button><div id="caInviteStatus" style="font-size:12px;margin-top:8px"></div>`); const c=panel.querySelector('#caCopyInvite'); c.onclick=async()=>{try{await navigator.clipboard.writeText(link);panel.querySelector('#caInviteStatus').textContent='Copied!';}catch{prompt('Copy this link:',link)}}; return; }
    if (kind === 'rentals') { openRentals(); return; }
    if (kind === 'account') { if(window.handleAccountAction) window.handleAccountAction(); else if(window.logout) window.logout(); return; }
  }

  async function loadTransactionsPanel() {
    try { const r=await fetch('/api/transactions',{headers:{Authorization:'Bearer '+token()},cache:'no-store'}); const d=await r.json().catch(()=>({})); const list=d.transactions||d.data||[]; document.getElementById('caTransactionsBody').innerHTML=list.length?list.map(x=>`<div class="ca-list-row"><span>${esc(x.description||x.type||'Transaction')}<br><small>${esc(x.created_at||x.createdAt||'')}</small></span><b>UGX ${Number(x.amount||0).toLocaleString()}</b></div>`).join(''):'<p style="font-size:12px">No transactions yet.</p>'; } catch { document.getElementById('caTransactionsBody').textContent='Unable to load transactions.'; }
  }
  async function loadTasks() {
    try { const r=await fetch('/api/tasks',{headers:{Authorization:'Bearer '+token()},cache:'no-store'}); const d=await r.json().catch(()=>({})); const list=d.tasks||[]; document.getElementById('caTasksBody').innerHTML=list.length?list.map(x=>`<div class="ca-list-row"><span><b>${esc(x.title||x.name||'Task')}</b><br><small>Reward: UGX ${Number(x.reward||x.reward_amount||0).toLocaleString()}</small></span>${x.claimed?'<span>✅ Claimed</span>':`<button class="ca-primary" data-task="${esc(x.id)}">Claim</button>`}</div>`).join(''):'<p style="font-size:12px">No tasks available.</p>'; panel.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>claimTask(b.dataset.task)); } catch { document.getElementById('caTasksBody').textContent='Unable to load tasks.'; }
  }
  async function claimTask(id){try{const r=await fetch('/api/tasks/'+encodeURIComponent(id)+'/claim',{method:'POST',headers:{Authorization:'Bearer '+token()}});const d=await r.json().catch(()=>({}));alert(d.message||'Task updated');syncBalance();loadTasks();}catch{alert('Unable to claim task.')}}
  async function loadRewards(){try{const r=await fetch('/api/rewards',{headers:{Authorization:'Bearer '+token()},cache:'no-store'});const d=await r.json().catch(()=>({}));const list=d.rewards||[];document.getElementById('caRewardsBody').innerHTML=list.length?list.map(x=>`<div class="ca-list-row"><span><b>${esc(x.title||x.name||'Reward')}</b><br><small>UGX ${Number(x.amount||x.reward||0).toLocaleString()}</small></span>${x.claimed?'<span>✅ Claimed</span>':`<button class="ca-primary" data-reward="${esc(x.id)}">Claim</button>`}</div>`).join(''):'<p style="font-size:12px">No rewards available.</p>';panel.querySelectorAll('[data-reward]').forEach(b=>b.onclick=()=>claimReward(b.dataset.reward));}catch{document.getElementById('caRewardsBody').textContent='Unable to load rewards.'}}
  async function claimReward(id){try{const r=await fetch('/api/rewards/'+encodeURIComponent(id)+'/claim',{method:'POST',headers:{Authorization:'Bearer '+token()}});const d=await r.json().catch(()=>({}));alert(d.message||'Reward updated');syncBalance();loadRewards();}catch{alert('Unable to claim reward.')}}
  async function loadTeam(){try{const r=await fetch('/api/team',{headers:{Authorization:'Bearer '+token()},cache:'no-store'});const d=await r.json().catch(()=>({}));const list=d.team||d.members||[];document.getElementById('caTeamBody').innerHTML=`<div class="ca-list-row"><span>Total team members</span><b>${list.length}</b></div>`+(list.length?list.map(x=>`<div class="ca-list-row"><span>${esc(x.name||x.phone||'Member')}</span><span>UGX ${Number(x.earnings||x.total_earnings||0).toLocaleString()}</span></div>`).join(''):'<p style="font-size:12px">No team members yet.</p>')}catch{document.getElementById('caTeamBody').textContent='Unable to load team.'}}

  function setupRentalMount(){
    const observer=new MutationObserver(()=>{
      const catalog=document.getElementById('casharrowRentalCatalog');
      if(catalog && home && !home.querySelector('.ca-rental-wrap')){
        const wrap=document.createElement('div');wrap.className='ca-rental-wrap';wrap.appendChild(catalog);panel.appendChild(wrap);
        makeRentalTabs(catalog); catalog.style.display='block';
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),15000);
  }
  function makeRentalTabs(catalog){
    const tabs=catalog.querySelector('.ca-series-tabs'); if(!tabs || tabs.querySelector('[data-all-series]')) return;
    const all=document.createElement('button');all.className='ca-series-tab active';all.dataset.allSeries='1';all.innerHTML='All<small>20 products</small>';
    tabs.insertBefore(all,tabs.firstChild);
    all.onclick=()=>{tabs.querySelectorAll('.ca-series-tab').forEach(x=>x.classList.remove('active'));all.classList.add('active');catalog.querySelectorAll('.ca-series-panel').forEach(p=>p.classList.add('active'));};
    tabs.querySelectorAll('.ca-series-tab:not([data-all-series])').forEach(tab=>{const old=tab.onclick;tab.addEventListener('click',()=>{all.classList.remove('active');catalog.querySelectorAll('.ca-series-panel').forEach(p=>p.classList.remove('active'));});});
  }
  function openRentals(){
    showPanel('🏹 Rentals');
    const wrap=home.querySelector('.ca-rental-wrap');
    if(wrap){wrap.classList.add('open');return;}
    const catalog=document.getElementById('casharrowRentalCatalog');
    if(catalog){const w=document.createElement('div');w.className='ca-rental-wrap open';w.appendChild(catalog);panel.appendChild(w);makeRentalTabs(catalog);catalog.style.display='block';}
  }

  function start(){
    if(!token()) return;
    ensureHome();
    if(home){ syncBalance(); setInterval(syncBalance,15000); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  window.cashArrowCompactHome=start;
})();
