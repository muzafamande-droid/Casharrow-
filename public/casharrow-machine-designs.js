(() => {
  if (window.__cashArrowMachineDesigns) return;
  window.__cashArrowMachineDesigns = true;

  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const palette = {
    A:{main:'#0877ff', deep:'#062b66', edge:'#8fd0ff', panel:'#0a3f86'},
    B:{main:'#0b67dc', deep:'#041f50', edge:'#79c4ff', panel:'#063778'},
    C:{main:'#0757c9', deep:'#03183f', edge:'#70baff', panel:'#052f70'},
    D:{main:'#0646b8', deep:'#020f2f', edge:'#79c7ff', panel:'#06275d'}
  };

  const idFor = code => String(code).replace(/[^A-Za-z0-9]/g,'');
  const num = code => Math.max(1, Math.min(5, Number(String(code).replace(/\D/g,'')) || 1));

  function defs(id,p){
    return `<defs>
      <linearGradient id="body${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#49aaff"/><stop offset=".42" stop-color="${p.main}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>
      <linearGradient id="top${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9efff"/><stop offset=".35" stop-color="${p.edge}"/><stop offset="1" stop-color="${p.main}"/></linearGradient>
      <linearGradient id="glass${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#55d8ff"/><stop offset=".45" stop-color="#063c7d"/><stop offset="1" stop-color="#020d25"/></linearGradient>
      <filter id="shadow${id}" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="14" stdDeviation="10" flood-opacity=".34"/></filter>
    </defs>`;
  }

  function wheel(x,y,r=22){return `<circle cx="${x}" cy="${y}" r="${r}" fill="#020b1d" stroke="#bfe3ff" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r-8}" fill="#0b2548" stroke="#3e8ed2" stroke-width="3"/>`;}
  function gauge(x,y,r=31){return `<circle cx="${x}" cy="${y}" r="${r}" fill="#020b20" stroke="#d7edff" stroke-width="5"/><path d="M${x-r+9} ${y+8}A${r-9} ${r-9} 0 0 1 ${x+r-8} ${y+8}" fill="none" stroke="#147dff" stroke-width="5"/><path d="M${x} ${y}l${Math.round(r*.55)} -${Math.round(r*.48)}" stroke="#72e2ff" stroke-width="5" stroke-linecap="round"/>`;}
  function leds(x,y,count){return Array.from({length:count},(_,i)=>`<circle cx="${x+i*25}" cy="${y}" r="6" fill="${['#39d98a','#ffd34e','#63c9ff','#a98bff','#ff6f91'][i%5]}"/>`).join('');}
  function screws(x,y,count=4){return Array.from({length:count},(_,i)=>`<circle cx="${x+(i%2)*((count>3)?360:120)}" cy="${y+Math.floor(i/2)*120}" r="4" fill="#d8edff" opacity=".8"/>`).join('');}

  function A(n,p,id){
    const w=360+n*16, x=350-w/2;
    const shapes=[
      `<path d="M${x} 292V126L${x+38} 91H${x+w-48}L${x+w} 122V292L${x+w-38} 315H${x+38}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="5"/>
       <path d="M${x+w-48} 91L${x+w} 122V292L${x+w-38} 315V125Z" fill="${p.deep}"/>
       <path d="M${x+38} 91H${x+w-48}L${x+w} 122H${x+75}Z" fill="url(#top${id})" opacity=".72"/>`,
      `<path d="M${x} 300V112L${x+54} 78H${x+w-58}L${x+w} 112V300L${x+w-35} 324H${x+35}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="5"/>
       <path d="M${x+w-58} 78L${x+w} 112V300L${x+w-35} 324V118Z" fill="${p.deep}"/>
       <path d="M${x+54} 78H${x+w-58}L${x+w} 112H${x+92}Z" fill="url(#top${id})" opacity=".72"/>`,
      `<path d="M${x} 292L${x+18} 105L${x+62} 70H${x+w-58}L${x+w} 105L${x+w-18} 292L${x+w-55} 318H${x+55}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="5"/>
       <path d="M${x+w-58} 70L${x+w} 105L${x+w-18} 292L${x+w-55} 318V105Z" fill="${p.deep}"/>
       <path d="M${x+62} 70H${x+w-58}L${x+w} 105H${x+100}Z" fill="url(#top${id})" opacity=".72"/>`,
      `<path d="M${x} 300V136L${x+32} 100L${x+80} 72H${x+w-74}L${x+w-20} 100L${x+w} 136V300L${x+w-46} 326H${x+46}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="5"/>
       <path d="M${x+w-74} 72L${x+w-20} 100L${x+w} 136V300L${x+w-46} 326V120Z" fill="${p.deep}"/>
       <path d="M${x+80} 72H${x+w-74}L${x+w-20} 100H${x+120}Z" fill="url(#top${id})" opacity=".72"/>`,
      `<path d="M${x} 300V118L${x+48} 76H${x+w-56}L${x+w} 118V300L${x+w-42} 327H${x+42}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="5"/>
       <path d="M${x+w-56} 76L${x+w} 118V300L${x+w-42} 327V125Z" fill="${p.deep}"/>
       <path d="M${x+48} 76H${x+w-56}L${x+w} 118H${x+92}Z" fill="url(#top${id})" opacity=".72"/>`
    ];
    let control='';
    if(n===1) control=`<rect x="145" y="145" width="185" height="112" rx="16" fill="${p.panel}" stroke="#c8e8ff" stroke-width="4"/><rect x="365" y="145" width="130" height="55" rx="10" fill="#02142f" stroke="${p.edge}" stroke-width="3"/>${gauge(432,236,29)}${leds(385,173,3)}`;
    if(n===2) control=`<rect x="130" y="137" width="205" height="132" rx="22" fill="#052e68" stroke="#c8e8ff" stroke-width="4"/><circle cx="232" cy="203" r="39" fill="#020b20" stroke="${p.edge}" stroke-width="7"/>${gauge(432,200,31)}<rect x="374" y="246" width="118" height="24" rx="6" fill="#02142f"/>`;
    if(n===3) control=`<rect x="125" y="126" width="175" height="154" rx="14" fill="#052e68" stroke="#c8e8ff" stroke-width="4"/><g fill="#1572d5">${[0,1,2,3,4].map(i=>`<rect x="148" y="148" width="130" height="12" rx="5" y="${148+i*25}"/>`).join('')}</g><rect x="330" y="126" width="175" height="154" rx="14" fill="#02142f" stroke="${p.edge}" stroke-width="4"/>${gauge(385,188,30)}<rect x="424" y="151" width="55" height="30" rx="5" fill="#000b1e"/>${leds(425,224,3)}`;
    if(n===4) control=`<rect x="118" y="130" width="390" height="142" rx="16" fill="#052e68" stroke="#c8e8ff" stroke-width="4"/><rect x="143" y="153" width="135" height="95" rx="12" fill="#02142f"/>${gauge(210,201,34)}<rect x="310" y="153" width="168" height="42" rx="8" fill="#000c20" stroke="${p.edge}" stroke-width="3"/>${leds(330,222,5)}`;
    if(n===5) control=`<rect x="112" y="120" width="398" height="166" rx="20" fill="#031d4b" stroke="#d8edff" stroke-width="5"/><circle cx="205" cy="204" r="57" fill="#020b20" stroke="${p.edge}" stroke-width="8"/>${gauge(205,204,44)}<rect x="305" y="146" width="170" height="55" rx="9" fill="#000b1d"/>${leds(320,233,6)}`;
    return shapes[n-1]+control+`<rect x="${x+35}" y="285" width="${w-70}" height="28" rx="8" fill="#02132d"/>${wheel(x+48,337,21)}${wheel(x+w-48,337,21)}${screws(x+35,116,4)}`;
  }

  function B(n,p,id){
    const widths=[350,380,410,440,470], heights=[225,245,265,285,305], w=widths[n-1], h=heights[n-1], x=350-w/2, top=355-h;
    const crown=[
      `<path d="M${x+28} ${top+30}L${x+65} ${top}H${x+w-70}L${x+w-25} ${top+30}V345H${x+28}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="6"/>`,
      `<path d="M${x+15} ${top+38}L${x+62} ${top-5}H${x+w-62}L${x+w-15} ${top+38}V345H${x+15}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="6"/>`,
      `<path d="M${x+8} ${top+48}L${x+58} ${top-12}H${x+w-58}L${x+w-8} ${top+48}V345H${x+8}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="7"/>`,
      `<path d="M${x} ${top+58}L${x+52} ${top-20}H${x+w-52}L${x+w} ${top+58}V345H${x}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="7"/>`,
      `<path d="M${x-6} ${top+66}L${x+48} ${top-28}H${x+w-48}L${x+w+6} ${top+66}V345H${x-6}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="8"/>`
    ];
    const cx=350, panelY=top+62;
    let face='';
    if(n<3) face=`<rect x="${x+55}" y="${panelY}" width="${w-110}" height="${h-96}" rx="18" fill="${p.panel}" stroke="#cbe9ff" stroke-width="5"/><rect x="${x+82}" y="${panelY+25}" width="${w-230}" height="48" rx="8" fill="#001127"/>${gauge(cx+80,panelY+105,34)}${leds(x+90,panelY+98,4)}`;
    else face=`<rect x="${x+45}" y="${panelY}" width="${w-90}" height="${h-94}" rx="20" fill="${p.panel}" stroke="#cbe9ff" stroke-width="5"/><rect x="${x+75}" y="${panelY+24}" width="${w-150}" height="55" rx="10" fill="#001027"/><rect x="${x+75}" y="${panelY+95}" width="${w-270}" height="70" rx="12" fill="#03142f"/>${gauge(x+120,panelY+130,29)}<rect x="${x+235}" y="${panelY+98}" width="${w-320}" height="18" rx="6" fill="#0b5db9"/>${leds(x+245,panelY+145,Math.min(6,n+1))}`;
    return crown[n-1]+`<path d="M${x+58} ${top}H${x+w-58}L${x+w} ${top+58}H${x+100}Z" fill="url(#top${id})" opacity=".7"/>`+face+`<path d="M${x+w-25} ${top+30}V345H${x+w-2}V${top+60}Z" fill="${p.deep}"/>${wheel(x+52,360,25)}${wheel(x+w-52,360,25)}<path d="M${x+22} ${top+70}V330M${x+w-22} ${top+70}V330" stroke="#2b91ff" stroke-width="9" opacity=".65"/>`;
  }

  function C(n,p,id){
    const w=440+n*22, x=350-w/2;
    const body=`<path d="M${x} 322V130L${x+52} 76H${x+w-52}L${x+w} 130V322L${x+w-55} 350H${x+55}Z" fill="url(#body${id})" stroke="${p.edge}" stroke-width="7"/>
      <path d="M${x+w-52} 76L${x+w} 130V322L${x+w-55} 350V134Z" fill="${p.deep}"/>
      <path d="M${x+52} 76H${x+w-52}L${x+w} 130H${x+98}Z" fill="url(#top${id})" opacity=".72"/>`;
    const split=n%2?`<rect x="${x+45}" y="130" width="${w*.37}" height="154" rx="18" fill="#031b4b" stroke="#cceaff" stroke-width="5"/>${gauge(x+130,207,43)}<rect x="${x+w*.48}" y="130" width="${w*.43}" height="154" rx="18" fill="${p.panel}" stroke="${p.edge}" stroke-width="5"/><rect x="${x+w*.53}" y="154" width="${w*.33}" height="42" rx="8" fill="#000d23"/>${leds(x+w*.55,225,5)}`:`<rect x="${x+42}" y="124" width="${w-84}" height="170" rx="20" fill="${p.panel}" stroke="#d7edff" stroke-width="6"/><rect x="${x+75}" y="150" width="${w-150}" height="52" rx="9" fill="#000c20"/>${gauge(350,245,42)}${leds(x+92,265,6)}`;
    const rails=n>=3?`<path d="M${x+22} 112V328M${x+w-22} 112V328" stroke="#bfe5ff" stroke-width="9"/><path d="M${x+32} 112V328M${x+w-32} 112V328" stroke="#0757c9" stroke-width="5"/>`:'';
    return body+split+rails+`<rect x="${x+30}" y="310" width="${w-60}" height="35" rx="9" fill="#02142e"/>${wheel(x+65,367,28)}${wheel(x+w-65,367,28)}`;
  }

  function D(n,p,id){
    const w=520+n*20, x=350-w/2;
    const body=`<path d="M${x} 330V112L${x+58} 55H${x+w-58}L${x+w} 112V330L${x+w-62} 362H${x+62}Z" fill="url(#body${id})" stroke="#d8eeff" stroke-width="8"/>
      <path d="M${x+w-58} 55L${x+w} 112V330L${x+w-62} 362V116Z" fill="${p.deep}"/>
      <path d="M${x+58} 55H${x+w-58}L${x+w} 112H${x+112}Z" fill="url(#top${id})" opacity=".78"/>
      <path d="M${x+20} 120V325M${x+w-20} 120V325" stroke="#64b9ff" stroke-width="13" opacity=".7"/>`;
    const core=n===1?`<rect x="${x+65}" y="125" width="${w-130}" height="170" rx="22" fill="#031b45" stroke="#d8eeff" stroke-width="6"/><circle cx="260" cy="210" r="60" fill="#020b20" stroke="#72caff" stroke-width="9"/>${gauge(260,210,48)}<rect x="345" y="157" width="${w-425}" height="45" rx="8" fill="#000b1d"/>${leds(355,235,5)}`:
      n===2?`<rect x="${x+55}" y="116" width="${w-110}" height="190" rx="24" fill="${p.panel}" stroke="#d8eeff" stroke-width="6"/><rect x="${x+88}" y="146" width="${w-176}" height="54" rx="10" fill="#000b1e"/>${gauge(235,252,47)}${gauge(465,252,47)}`:
      n===3?`<rect x="${x+52}" y="110" width="${w-104}" height="198" rx="25" fill="#031a42" stroke="#d8eeff" stroke-width="7"/><rect x="${x+90}" y="140" width="${w-180}" height="62" rx="10" fill="#000b1d"/>${leds(x+110,230,7)}${gauge(350,270,45)}`:
      n===4?`<rect x="${x+45}" y="102" width="${w-90}" height="210" rx="28" fill="${p.panel}" stroke="#d8eeff" stroke-width="7"/><rect x="${x+82}" y="135" width="${w-164}" height="65" rx="10" fill="#000a1c"/>${gauge(220,258,48)}${gauge(480,258,48)}${leds(330,225,7)}`:
      `<rect x="${x+38}" y="94" width="${w-76}" height="220" rx="30" fill="#021536" stroke="#e2f2ff" stroke-width="8"/><rect x="${x+78}" y="126" width="${w-156}" height="70" rx="12" fill="#00091b"/>${gauge(230,262,52)}${gauge(470,262,52)}${leds(x+185,225,8)}`;
    return body+core+`<rect x="${x+28}" y="315" width="${w-56}" height="45" rx="12" fill="#020e25" stroke="#6ebcff" stroke-width="3"/>${wheel(x+70,378,31)}${wheel(x+w-70,378,31)}<path d="M${x+48} 118V332M${x+w-48} 118V332" stroke="#0a73df" stroke-width="14"/>`;
  }

  function draw(code){
    const c=String(code||'A1').toUpperCase();
    const s=c.charAt(0), n=num(c), p=palette[s]||palette.A, id=idFor(c);
    let body=s==='A'?A(n,p,id):s==='B'?B(n,p,id):s==='C'?C(n,p,id):D(n,p,id);
    const label={A:'STARTER',B:'GROWTH',C:'PRO',D:'FLAGSHIP'}[s]||'STARTER';
    return `<svg class="ca-machine-svg ca-machine-${s.toLowerCase()}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 430" role="img" aria-label="CashArrow ${esc(c)} machine">${defs(id,p)}<rect width="700" height="430" rx="28" fill="#eef5fd"/><ellipse cx="350" cy="393" rx="270" ry="18" fill="#0b2342" opacity=".18"/><g filter="url(#shadow${id})">${body}</g><rect x="24" y="22" width="178" height="40" rx="20" fill="${p.main}"/><text x="113" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="900" fill="#fff">${label} SERIES</text><rect x="512" y="22" width="164" height="40" rx="20" fill="#052653" stroke="#73c4ff"/><text x="594" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="900" fill="#dff2ff">${esc(c)} MACHINE</text><text x="350" y="418" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="800" fill="#41617f">CASHARROW • ${label} EQUIPMENT</text></svg>`;
  }

  function codeFrom(root){
    const title=root?.querySelector?.('h3');
    const m=title?.textContent.match(/\b([ABCD][1-5])\b/i);
    return m?m[1].toUpperCase():null;
  }

  function replace(root=document){
    root.querySelectorAll?.('.ca-product').forEach(row=>{
      const code=codeFrom(row), art=row.querySelector('.ca-product-art');
      if(code&&art&&art.dataset.caDesign!==code){art.innerHTML=draw(code);art.dataset.caDesign=code;}
    });
    const modal=document.querySelector('.ca-modal'), art=modal?.querySelector('.ca-detail-art'), code=modal?codeFrom(modal):null;
    if(code&&art&&art.dataset.caDesign!==code){art.innerHTML=draw(code);art.dataset.caDesign=code;}
  }

  function style(){
    if(document.getElementById('cashArrowMachineDesignStyle'))return;
    const s=document.createElement('style'); s.id='cashArrowMachineDesignStyle'; s.textContent=`
      .ca-product-art{background:linear-gradient(145deg,#fbfdff,#e5f1fc)!important;border:1px solid #a9d3f7!important;box-shadow:0 12px 30px rgba(5,63,125,.14)!important;overflow:hidden!important}
      .ca-product-art .ca-machine-svg{transition:transform .3s ease,filter .3s ease!important;transform-origin:center!important}
      .ca-product-art:hover .ca-machine-svg{transform:translateY(-4px) scale(1.025)!important;filter:saturate(1.08) drop-shadow(0 8px 8px rgba(0,60,130,.12))!important}
      .ca-detail-art{background:linear-gradient(145deg,#fbfdff,#e5f1fc)!important;border:1px solid #b8d9f5!important;min-height:250px!important}
      .ca-detail-art .ca-machine-svg{width:100%!important;height:100%!important;display:block!important}
      .ca-product h3{font-size:24px!important;line-height:1.15!important;letter-spacing:-.2px!important}
      .ca-product p{font-size:17px!important;line-height:1.55!important}
      .ca-buy{height:40px!important;min-height:40px!important;padding:8px 15px!important;font-size:14px!important;border-radius:10px!important;box-shadow:0 5px 12px rgba(7,87,232,.18)!important}
      @media(max-width:560px){.ca-product-art{height:190px!important}.ca-product h3{font-size:23px!important}.ca-product p{font-size:16px!important}.ca-buy{height:38px!important;min-height:38px!important;font-size:13px!important;justify-self:start!important}}
    `; document.head.appendChild(s);
  }

  style();
  replace();
  const observer=new MutationObserver(()=>replace());
  observer.observe(document.body,{childList:true,subtree:true});
})();