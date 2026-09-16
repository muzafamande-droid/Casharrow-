(()=>{
  if(window.__aveilotReferralDashboard)return;
  window.__aveilotReferralDashboard=true;
  const money=n=>'UGX '+Number(n||0).toLocaleString();
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const token=localStorage.getItem('casharrowToken');
  if(!token)return;
  const style=document.createElement('style');
  style.textContent=`
  .av-team-summary{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px}
  .av-team-stat{background:linear-gradient(145deg,#f7fbff,#eef6ff);border:1px solid #dce9f7;border-radius:14px;padding:12px}
  .av-team-stat span{display:block;font-size:10px;text-transform:uppercase;font-weight:800;color:#718096}
  .av-team-stat b{display:block;margin-top:5px;font-size:18px;color:#172033}
  .av-team-payout{padding:13px;border-radius:14px;background:#fff8e7;border:1px solid #f1d58f;margin-bottom:12px;color:#6f5200;font-size:12px;line-height:1.45}
  .av-team-payout strong{display:block;font-size:14px;margin-bottom:3px}
  .av-team-member{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#f7f9fd;border:1px solid #e2e9f3;border-radius:13px;padding:12px}
  .av-team-member strong{display:block;font-size:13px}.av-team-member small{display:block;color:#718096;margin-top:4px}
  .av-team-member .status{font-size:10px;font-weight:900;padding:6px 8px;border-radius:999px;background:#eef4ff;color:#0757e8;white-space:nowrap}
  @media(max-width:480px){.av-team-stat b{font-size:16px}}
  `;
  document.head.appendChild(style);
  function api(){return fetch('/api/referral-summary',{headers:{Authorization:'Bearer '+token},cache:'no-store'}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Unable to load referral data');return d})}
  function render(d){
    const host=document.getElementById('team');
    if(!host)return;
    const members=d.directMembers||[];
    const next=d.nextPayoutDate?new Date(d.nextPayoutDate+'T00:00:00').toLocaleDateString('en-UG',{day:'numeric',month:'long',year:'numeric'}):'the 5th of the next applicable month';
    host.innerHTML=`<div class="av-team-summary">
      <div class="av-team-stat"><span>Direct members</span><b>${Number(d.directMemberCount||0)}</b></div>
      <div class="av-team-stat"><span>Team purchases</span><b>${Number(d.teamPurchases||0)}</b></div>
      <div class="av-team-stat"><span>Pending earnings</span><b>${money(d.pendingReferralEarnings)}</b></div>
      <div class="av-team-stat"><span>Paid earnings</span><b>${money(d.paidReferralEarnings)}</b></div>
      <div class="av-team-stat"><span>Total earnings</span><b>${money(d.totalReferralEarnings)}</b></div>
      <div class="av-team-stat"><span>Team rental volume</span><b>${money(d.teamRentalVolume)}</b></div>
    </div>
    <div class="av-team-payout"><strong>📅 Referral payout: 5th of every month</strong>Pending referral earnings are held until their scheduled payout date. Next pending payout: ${esc(next)}.</div>
    <h3>Direct members</h3>
    ${members.length?members.map(m=>`<div class="av-team-member"><div><strong>${esc(m.name||m.phone||'Member')}</strong><small>Joined ${esc(m.created_at||'')}</small></div><span class="status">Direct referral</span></div>`).join(''):'<div class="empty">No direct members yet. Share your referral link to start building your team.</div>'}`;
  }
  async function load(){try{render(await api())}catch(e){const host=document.getElementById('team');if(host)host.innerHTML='<div class="empty">Referral information is temporarily unavailable. Please try again.</div>';}}
  function start(){load();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
