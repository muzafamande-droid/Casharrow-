(()=>{
  if(window.__aveilotReferralCinematic)return;
  window.__aveilotReferralCinematic=true;
  const style=document.createElement('style');
  style.textContent=`
  .av-ref-cinema{position:relative;overflow:hidden;margin-top:13px;border-radius:24px;padding:0;background:#07152d;color:#fff;box-shadow:0 18px 50px rgba(4,24,60,.24);border:1px solid rgba(75,180,255,.25)}
  .av-ref-cinema:before{content:'';position:absolute;inset:-40%;background:radial-gradient(circle at 20% 30%,rgba(0,174,255,.28),transparent 28%),radial-gradient(circle at 85% 70%,rgba(91,95,247,.28),transparent 30%);animation:avRefGlow 7s ease-in-out infinite alternate}
  .av-ref-track{display:flex;width:500%;transition:transform .7s cubic-bezier(.22,.8,.25,1);position:relative;z-index:1}
  .av-ref-slide{width:20%;min-height:205px;padding:20px;display:flex;flex-direction:column;justify-content:center;position:relative}
  .av-ref-slide:after{content:'';position:absolute;width:120px;height:120px;border:1px solid rgba(255,255,255,.11);border-radius:50%;right:-35px;top:-35px;box-shadow:0 0 35px rgba(24,200,255,.12)}
  .av-ref-kicker{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#6edaff;font-weight:900}
  .av-ref-title{font-size:25px;line-height:1.05;font-weight:1000;margin:7px 0 8px;max-width:88%}
  .av-ref-copy{font-size:12px;line-height:1.45;color:rgba(255,255,255,.72);max-width:88%}
  .av-ref-money{font-size:30px;font-weight:1000;color:#fff;text-shadow:0 0 22px rgba(24,200,255,.35);margin-top:9px}
  .av-ref-badge{display:inline-flex;width:max-content;margin-top:11px;padding:7px 10px;border-radius:999px;background:rgba(24,200,255,.12);border:1px solid rgba(24,200,255,.28);font-size:11px;font-weight:900;color:#9be9ff}
  .av-ref-dots{display:flex;gap:6px;position:absolute;z-index:3;left:20px;bottom:13px}
  .av-ref-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3);transition:.25s}.av-ref-dot.active{width:20px;border-radius:5px;background:#28cfff;box-shadow:0 0 10px rgba(40,207,255,.65)}
  .av-ref-spark{position:absolute;right:20px;bottom:17px;font-size:26px;opacity:.8}
  @keyframes avRefGlow{from{transform:translate3d(-2%,0,0) scale(1)}to{transform:translate3d(2%,2%,0) scale(1.08)}}
  .av-member-avatar{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#071a38,#087cff);border:1px solid rgba(110,218,255,.55);box-shadow:0 8px 24px rgba(0,64,160,.28),inset 0 1px 0 rgba(255,255,255,.2);color:#fff;font-size:17px;font-weight:1000;font-style:italic;letter-spacing:-.05em}
  .av-avatar-label{font-size:10px!important;letter-spacing:.08em!important;color:#6b7b91!important}
  @media(max-width:480px){.av-ref-slide{min-height:198px;padding:18px}.av-ref-title{font-size:22px}.av-ref-money{font-size:27px}}
  `;
  document.head.appendChild(style);

  const money=n=>'UGX '+Number(n||0).toLocaleString();
  let products=[];let index=0;let timer;
  async function load(){try{const r=await fetch('/api/products',{cache:'no-store'});const d=await r.json();products=Array.isArray(d)?d:(d.products||[]);render();}catch{render();}}
  function commission(code){const p=products.find(x=>String(x.code||'').toUpperCase()===String(code).toUpperCase());return p?Math.round(Number(p.rental_fee||p.fee||0)*.10):0}
  function render(){
    const host=document.querySelector('.referral-hero');if(!host)return;
    const existing=host.querySelector('.av-ref-cinema');if(existing)existing.remove();
    const samples=[
      {k:'DIRECT REFERRAL',t:'Rent A2. You earn 10%.',c:'Your friend rents a machine → your commission follows the 10% rule.',code:'A2'},
      {k:'INVITE A FRIEND',t:'Share your AVEILOT link.',c:'Your friend joins through your personal referral link and starts their first rental.',code:null},
      {k:'BIG RENTAL • D4',t:'Your friend rents D4.',c:'D4 rental fee: UGX 850,000. Your direct referral commission:',code:'D4'},
      {k:'SMART REFERRALS',t:'Your friend rents B2.',c:'B2 rental fee: UGX 80,000. Your direct referral commission:',code:'B2'},
      {k:'SHARE MORE',t:'Invite. Rent. Earn.',c:'Keep sharing your referral link. Every eligible direct first rental earns 10%.',code:null}
    ];
    const track=document.createElement('div');track.className='av-ref-track';
    track.innerHTML=samples.map((s,i)=>{const amount=s.code?commission(s.code):0;return `<article class="av-ref-slide"><div class="av-ref-kicker">${s.k}</div><div class="av-ref-title">${s.t}</div><div class="av-ref-copy">${s.c}</div>${amount?`<div class="av-ref-money">${money(amount)}</div><div class="av-ref-badge">10% direct commission</div>`:`<div class="av-ref-badge">Share → Friend joins → First rental → You earn</div>`}<div class="av-ref-spark">✦</div></article>`}).join('');
    const box=document.createElement('div');box.className='av-ref-cinema';box.appendChild(track);
    const dots=document.createElement('div');dots.className='av-ref-dots';samples.forEach((_,i)=>{const d=document.createElement('span');d.className='av-ref-dot'+(i===0?' active':'');dots.appendChild(d)});box.appendChild(dots);
    host.insertBefore(box,host.querySelector('.referral-stats')||host.firstChild);
    clearInterval(timer);timer=setInterval(()=>{index=(index+1)%samples.length;track.style.transform=`translateX(-${index*20}%)`;dots.querySelectorAll('.av-ref-dot').forEach((d,i)=>d.classList.toggle('active',i===index));},4200);
  }
  function avatar(){
    document.querySelectorAll('.nav').forEach(n=>{if(n.dataset.nav==='account'){const icon=n.querySelector('div');if(icon){icon.textContent='AV';icon.className='av-member-avatar';}n.childNodes.forEach(x=>{if(x.nodeType===3&&x.textContent.trim())x.textContent=' My Account';});}});
  }
  function start(){render();avatar();load();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
