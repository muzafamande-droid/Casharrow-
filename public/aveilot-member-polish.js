(()=>{
  const style=document.createElement('style');
  style.textContent=`
  :root{--av-blue:#087cff;--av-cyan:#18c8ff;--av-indigo:#5b5ff7;--av-ink:#172033;--av-bg:#f4f8ff}
  body{background:radial-gradient(circle at 12% -5%,rgba(24,200,255,.13),transparent 28%),radial-gradient(circle at 95% 8%,rgba(91,95,247,.10),transparent 25%),var(--av-bg)!important}
  .container{max-width:820px!important}
  .hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#0757e8 0%,#087cff 45%,#17bfff 100%)!important;border-radius:26px!important;padding:20px!important;box-shadow:0 18px 45px rgba(7,87,232,.24),inset 0 1px 0 rgba(255,255,255,.35)!important}
  .hero:before{content:"";position:absolute;width:180px;height:180px;border-radius:50%;right:-65px;top:-75px;background:radial-gradient(circle,rgba(255,255,255,.35),rgba(255,255,255,0) 68%);pointer-events:none}
  .hero:after{content:"";position:absolute;width:110px;height:110px;border:1px solid rgba(255,255,255,.18);border-radius:28px;right:20px;bottom:-55px;transform:rotate(28deg);pointer-events:none}
  .av-brand{position:relative;z-index:2;display:flex;align-items:center;gap:11px;margin-bottom:4px}
  .av-logo{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;position:relative;background:linear-gradient(145deg,#fff,#dff6ff);box-shadow:0 8px 22px rgba(0,28,100,.22),inset 0 1px 0 #fff;flex:none}
  .av-logo:before{content:"A";font-weight:1000;font-size:25px;font-style:italic;background:linear-gradient(135deg,#0757e8,#13bfff);-webkit-background-clip:text;background-clip:text;color:transparent;transform:skew(-7deg)}
  .av-logo:after{content:"";position:absolute;width:18px;height:3px;border-radius:5px;background:#18c8ff;transform:rotate(-35deg);bottom:8px;right:7px;box-shadow:0 0 8px rgba(24,200,255,.7)}
  .av-wordmark{font-size:19px;font-weight:1000;letter-spacing:.08em;line-height:1;color:#fff}.av-tag{font-size:9px;letter-spacing:.16em;text-transform:uppercase;opacity:.78;margin-top:4px}
  .title{display:none!important}.welcome{position:relative;z-index:2;font-weight:700;margin-top:12px!important}.label,.balance,.quick{position:relative;z-index:2}
  .balance{font-size:36px!important;text-shadow:0 3px 14px rgba(0,25,90,.2)}
  .quick button,.btn{transition:transform .16s ease,box-shadow .16s ease}.quick button:active,.btn:active{transform:scale(.98)}
  .panel{border-radius:21px!important;border:1px solid rgba(214,226,243,.95)!important;box-shadow:0 10px 28px rgba(30,70,130,.075)!important}
  .panel h2{font-weight:950}
  .card,.row{border-radius:15px!important}
  .card{box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}
  .bottom{height:76px!important;background:rgba(255,255,255,.94)!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid #e1e9f4!important}
  .nav{transition:all .16s ease}.nav.active{background:#edf5ff}
  .nav.active div{filter:drop-shadow(0 3px 5px rgba(8,124,255,.18))}
  @media(max-width:480px){.hero{padding:18px!important}.av-logo{width:40px;height:40px}.av-wordmark{font-size:17px}.balance{font-size:31px!important}}
  `;
  document.head.appendChild(style);
  function brand(){
    const hero=document.querySelector('.hero');
    if(hero&&!hero.querySelector('.av-brand')){
      const b=document.createElement('div');b.className='av-brand';b.innerHTML='<div class="av-logo" aria-label="AVEILOT logo"></div><div><div class="av-wordmark">AVEILOT</div><div class="av-tag">Power • Rentals • Rewards</div></div>';
      hero.insertBefore(b,hero.firstChild);
    }
    document.title='AVEILOT Member';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',brand,{once:true});else brand();
})();
