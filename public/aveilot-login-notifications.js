(()=>{
  const token=localStorage.getItem('casharrowToken');
  if(!token) return;
  const sessionKey='aveilotLoginNoticeShown';
  if(sessionStorage.getItem(sessionKey)==='1') return;
  sessionStorage.setItem(sessionKey,'1');

  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'UGX '+Number(n||0).toLocaleString();
  const styles=`
    .aveilot-notice-backdrop{position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,10,25,.72);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);animation:aveNoticeFade .22s ease}
    .aveilot-notice{position:relative;width:min(470px,100%);overflow:hidden;border:1px solid rgba(255,255,255,.22);border-radius:26px;background:linear-gradient(145deg,#0b1530,#101f43 55%,#0757e8);color:#fff;box-shadow:0 28px 80px rgba(0,0,0,.42);animation:aveNoticeIn .32s cubic-bezier(.2,.8,.2,1)}
    .aveilot-notice:before{content:'';position:absolute;width:210px;height:210px;right:-90px;top:-80px;border-radius:50%;background:rgba(19,164,255,.24);filter:blur(3px);animation:aveNoticeOrbit 5s linear infinite}
    .ave-notice-top{position:relative;display:flex;align-items:center;justify-content:space-between;padding:18px 18px 0}
    .ave-notice-brand{font-size:11px;letter-spacing:2px;font-weight:1000;color:#8bd9ff}
    .ave-notice-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.22);border-radius:50%;background:rgba(255,255,255,.09);color:#fff;font-size:22px;line-height:1;cursor:pointer}
    .ave-notice-body{position:relative;padding:20px 20px 17px}
    .ave-notice-icon{font-size:36px;margin-bottom:8px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.2))}
    .ave-notice-title{margin:0;font-size:25px;line-height:1.08;font-weight:950;letter-spacing:-.5px}
    .ave-notice-text{margin:10px 0 0;color:rgba(255,255,255,.82);font-size:14px;line-height:1.55}
    .ave-notice-highlight{display:inline-block;margin-top:13px;padding:9px 12px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);font-size:12px;font-weight:900;color:#fff}
    .ave-notice-actions{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:0 20px 20px}
    .ave-notice-actions button{border:0;border-radius:13px;padding:13px;font-weight:950;cursor:pointer;min-height:47px}
    .ave-notice-next{background:#fff;color:#0757e8}.ave-notice-dismiss{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.18)!important}
    .ave-notice-progress{display:flex;gap:5px;justify-content:center;padding:0 20px 17px}.ave-notice-dot{width:22px;height:4px;border-radius:99px;background:rgba(255,255,255,.22)}.ave-notice-dot.active{background:#fff}
    @keyframes aveNoticeFade{from{opacity:0}to{opacity:1}}@keyframes aveNoticeIn{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}@keyframes aveNoticeOrbit{to{transform:rotate(360deg)}}
    @media(max-width:480px){.aveilot-notice-backdrop{padding:12px}.ave-notice-title{font-size:22px}.ave-notice-body{padding:17px}.ave-notice-actions{padding:0 17px 17px}}
    @media(prefers-reduced-motion:reduce){.aveilot-notice-backdrop,.aveilot-notice,.ave-notice:before{animation:none}}
  `;
  const style=document.createElement('style');style.textContent=styles;document.head.appendChild(style);

  async function api(path){
    try{
      const r=await fetch(path,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      if(!r.ok) return null;
      return await r.json().catch(()=>null);
    }catch{return null}
  }

  function buildNotices(products,rentals){
    const notices=[];
    const list=Array.isArray(products)?products:[];
    const active=list.filter(p=>p.active!==false);
    const featured=active.filter(p=>p.featured===true||p.featured==='true');
    const latest=featured[0]||active[active.length-1];
    if(latest){
      notices.push({icon:'🏭',title:'New machines are available',text:`Explore the latest AVEILOT machines and compare the rental fee, daily income and total return before you choose.`,highlight:latest.code?`${esc(latest.code)} • ${money(latest.rental_fee)} to start`: 'Open Machines to explore'});
    }

    const now=Date.now();
    const expiring=(Array.isArray(rentals)?rentals:[]).map(r=>{
      const raw=r.end_at||r.endAt||r.ends_at||r.expires_at;
      const t=raw?new Date(raw).getTime():NaN;
      return {...r,_end:t};
    }).filter(r=>Number.isFinite(r._end)&&r._end>now&&r._end-now<=3*86400000).sort((a,b)=>a._end-b._end);
    if(expiring.length){
      const r=expiring[0];
      const hours=Math.max(1,Math.ceil((r._end-now)/3600000));
      notices.push({icon:'⏳',title:'A machine is nearing expiry',text:`Your ${esc(r.code||r.name||'machine')} rental is nearing the end of its current term. Check My Machines for the exact end date and your generated earnings.`,highlight:hours<24?'Expires within 24 hours':`About ${hours} hours remaining`});
    }

    notices.push({icon:'🎁',title:'Earn by sharing your referral link',text:'Share your personal AVEILOT referral link with friends. When someone you directly referred makes their first machine rental, you earn the configured direct referral commission.',highlight:'10% direct referral commission'});
    notices.push({icon:'📲',title:'Your referral link is ready',text:'Open My Account to copy or share your personal referral link. Your friend can use that link to register and join AVEILOT.',highlight:'Share → Friend joins → First rental → You earn'});
    notices.push({icon:'⚡',title:'How machine earnings work',text:'Choose a machine, confirm the rental, and your machine generates its configured daily income during the rental period. Your rental history shows the progress.',highlight:'Daily income • Rental duration • Total return'});
    return notices;
  }

  function openPopup(notices){
    if(!notices.length) return;
    let index=0;
    const backdrop=document.createElement('div');backdrop.className='aveilot-notice-backdrop';
    const render=()=>{
      const n=notices[index];
      backdrop.innerHTML=`<div class="aveilot-notice" role="dialog" aria-modal="true" aria-label="AVEILOT notification">
        <div class="ave-notice-top"><div class="ave-notice-brand">AVEILOT • MEMBER UPDATE</div><button class="ave-notice-close" aria-label="Close">×</button></div>
        <div class="ave-notice-body"><div class="ave-notice-icon">${n.icon}</div><h2 class="ave-notice-title">${n.title}</h2><p class="ave-notice-text">${n.text}</p><div class="ave-notice-highlight">${n.highlight}</div></div>
        <div class="ave-notice-progress">${notices.map((_,i)=>`<span class="ave-notice-dot ${i===index?'active':''}"></span>`).join('')}</div>
        <div class="ave-notice-actions"><button class="ave-notice-dismiss">Close</button><button class="ave-notice-next">${index===notices.length-1?'Done':'Next'}</button></div>
      </div>`;
      const close=()=>{backdrop.remove();document.removeEventListener('keydown',onKey);};
      const onKey=e=>{if(e.key==='Escape')close();if(e.key==='ArrowRight'&&index<notices.length-1){index++;render()}};
      backdrop.querySelector('.ave-notice-close').onclick=close;
      backdrop.querySelector('.ave-notice-dismiss').onclick=close;
      backdrop.querySelector('.ave-notice-next').onclick=()=>{if(index<notices.length-1){index++;render()}else close()};
      backdrop.onclick=e=>{if(e.target===backdrop)close()};
      document.addEventListener('keydown',onKey);
    };
    document.body.appendChild(backdrop);render();
  }

  async function start(){
    await new Promise(r=>setTimeout(r,650));
    const [productsData,rentalsData]=await Promise.all([api('/api/products'),api('/api/rentals')]);
    const products=Array.isArray(productsData)?productsData:(productsData?.products||[]);
    const rentals=Array.isArray(rentalsData)?rentalsData:(rentalsData?.rentals||[]);
    openPopup(buildNotices(products,rentals));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();