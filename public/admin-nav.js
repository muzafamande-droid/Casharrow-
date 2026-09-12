(function(){
  const style=`<style id="aveilot-admin-nav-style">
    .admin-nav{position:sticky;top:0;z-index:50;display:grid;grid-template-columns:repeat(6,1fr);gap:8px;max-width:1100px;margin:12px auto;padding:8px;background:rgba(255,255,255,.96);border:1px solid #e5ebf3;border-radius:16px;box-shadow:0 8px 24px rgba(22,48,82,.10);backdrop-filter:blur(10px)}
    .admin-nav button{border:0;border-radius:11px;padding:11px 8px;background:#edf4ff;color:#0757e8;font-weight:800;font-size:12px;cursor:pointer;min-height:44px}
    .admin-nav button.active{background:#087cff;color:#fff;box-shadow:0 5px 14px rgba(8,124,255,.22)}
    .admin-panel{scroll-margin-top:82px}
    .admin-panel.is-hidden{display:none!important}
    .admin-panel.admin-overview{display:block}
    @media(max-width:700px){.admin-nav{grid-template-columns:repeat(3,1fr);margin:10px 0;padding:7px}.admin-nav button{font-size:11px;padding:9px 5px}}
  </style>`;
  const items=[
    ["overview","🏠 Overview"],
    ["members","👥 Members"],
    ["machines","🏭 Machines"],
    ["deposits","💳 Deposits"],
    ["withdrawals","📤 Withdrawals"],
    ["settings","⚙️ Settings"]
  ];
  function findPanels(){
    const main=document.querySelector("main.container");
    if(!main)return null;
    const sections=[...main.querySelectorAll(":scope > section")];
    const overview=sections.find(s=>s.querySelector("#dashboardMessage"));
    const machines=sections.find(s=>s.querySelector("#machineManagerList"));
    const deposits=sections.find(s=>s.querySelector("#depositsList"));
    const withdrawals=sections.find(s=>s.querySelector("#withdrawalsList"));
    const members=sections.find(s=>s.querySelector("#usersList"));
    const settings=sections.find(s=>s.querySelector("#adminMtnNumber"));
    const financial=sections.find(s=>s.querySelector("#fcPendingDeposits"));
    return {main,sections,overview,machines,deposits,withdrawals,members,settings,financial};
  }
  function show(name){
    const p=findPanels(); if(!p)return;
    const map={overview:[p.overview,p.financial],members:[p.members],machines:[p.machines],deposits:[p.deposits],withdrawals:[p.withdrawals],settings:[p.settings]};
    p.sections.forEach(s=>s.classList.add("is-hidden"));
    (map[name]||map.overview).filter(Boolean).forEach(s=>{s.classList.remove("is-hidden");s.classList.add("admin-panel")});
    document.querySelectorAll(".admin-nav button").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function mount(){
    if(document.getElementById("aveilotAdminNav"))return;
    const p=findPanels(); if(!p)return;
    document.head.insertAdjacentHTML("beforeend",style);
    const nav=document.createElement("nav");nav.id="aveilotAdminNav";nav.className="admin-nav";nav.setAttribute("aria-label","Admin sections");
    nav.innerHTML=items.map(([id,label])=>`<button type="button" data-panel="${id}">${label}</button>`).join("");
    p.main.insertBefore(nav,p.main.firstElementChild);
    nav.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>show(b.dataset.panel)));
    show("overview");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(mount,0),{once:true});else setTimeout(mount,0);
})();
