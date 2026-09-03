const express = require("express");

// Keep the existing CashArrow backend and add only the compact dashboard shell.
const app = require("./server-legacy");

const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    const compactUI = `
<style id="casharrowCompactUI">
body.ca-member-compact main.container > .cardbox:first-child{display:none!important}
body.ca-member-compact main.container > #memberTools{display:none!important}
body.ca-member-compact #todayTasks,body.ca-member-compact #rewardsSection,body.ca-member-compact #teamSection{display:none!important}
body.ca-member-compact #withdrawSection,body.ca-member-compact #transactions{display:none}
body.ca-member-compact #casharrowMyRentals{margin:0 0 12px}
body.ca-member-compact #rentalCatalog{margin-top:10px}
body.ca-member-compact .section-title{font-size:18px;margin:16px 0 8px}
body.ca-member-compact #userWallet{margin-bottom:12px}
body.ca-member-compact #casharrowDeposit{margin-bottom:12px}
</style>
<script>
(() => {
  const member = () => !!localStorage.getItem('casharrowToken');
  const el = id => document.getElementById(id);
  const visible = e => !!e && getComputedStyle(e).display !== 'none';
  const placeAfter = (anchor, node) => { if (!anchor || !node || anchor === node) return anchor; if (anchor.nextElementSibling !== node) anchor.insertAdjacentElement('afterend', node); return node; };

  function arrange(){
    const isMember=member();
    document.body.classList.toggle('ca-member-compact',isMember);
    if(!isMember)return;
    const wallet=el('userWallet'),deposit=el('casharrowDeposit'),withdraw=el('withdrawSection'),tx=el('transactions'),rentals=el('casharrowMyRentals'),catalog=el('rentalCatalog');
    if(!wallet)return;
    let anchor=wallet;
    if(visible(deposit))anchor=placeAfter(anchor,deposit)||anchor;
    if(visible(withdraw))anchor=placeAfter(anchor,withdraw)||anchor;
    if(visible(tx))anchor=placeAfter(anchor,tx)||anchor;
    if(visible(rentals))anchor=placeAfter(anchor,rentals)||anchor;
    if(visible(catalog))placeAfter(anchor,catalog);
    if(deposit&&!visible(deposit))deposit.style.display='none';
    if(withdraw&&!withdraw.dataset.cashArrowOpen)withdraw.style.display='none';
    if(tx&&!tx.dataset.cashArrowOpen)tx.style.display='none';
    if(typeof window.cashArrowRefreshRentals==='function'&&!window.__cashArrowInitialRentals){window.__cashArrowInitialRentals=true;window.cashArrowRefreshRentals();}
  }

  function goHome(){
    ['todayTasks','rewardsSection','teamSection','memberTools'].forEach(id=>{const e=el(id);if(e)e.style.display='none';});
    const w=el('userWallet'); if(w){w.style.display='block';w.scrollIntoView({behavior:'smooth',block:'start');}
    const navs=document.querySelectorAll('.bottom .nav');navs.forEach(n=>n.classList.remove('active'));if(navs[0])navs[0].classList.add('active');
    arrange();
  }

  function goWallet(){
    const w=el('userWallet');if(w){w.style.display='block';w.scrollIntoView({behavior:'smooth',block:'start');}
    const navs=document.querySelectorAll('.bottom .nav');navs.forEach(n=>n.classList.remove('active'));if(navs[2])navs[2].classList.add('active');
  }

  function goTasks(){
    if(!member()){if(typeof openModal==='function')openModal('login');return;}
    const tasks=el('todayTasks'),team=el('teamSection');
    if(tasks)tasks.style.display='block';
    if(team)team.style.display='block';
    const navs=document.querySelectorAll('.bottom .nav');navs.forEach(n=>n.classList.remove('active'));if(navs[1])navs[1].classList.add('active');
    arrange();
    if(tasks)tasks.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function goTeam(){goTasks();if(el('teamSection'))el('teamSection').scrollIntoView({behavior:'smooth',block:'start'});}
  function goRewards(){
    if(!member()){if(typeof openModal==='function')openModal('login');return;}
    const r=el('rewardsSection');if(r)r.style.display='block';arrange();if(r)r.scrollIntoView({behavior:'smooth',block:'start'});
  }

  // Restore navigation functions used by the original page and bottom nav.
  window.goToHome=goHome; window.goToWallet=goWallet; window.goToTasks=goTasks; window.goToTeam=goTeam; window.goToRewards=goRewards;

  function hookButtons(){
    if(typeof window.loadTransactions==='function'&&!window.__cashArrowTransactionsHook){
      const original=window.loadTransactions;window.loadTransactions=async function(){const s=el('transactions');if(s){s.dataset.cashArrowOpen='1';s.style.display='block';}arrange();if(s)s.scrollIntoView({behavior:'smooth',block:'nearest'});try{return await original.apply(this,arguments);}finally{if(s)s.style.display='block';}};window.__cashArrowTransactionsHook=true;
    }
    if(typeof window.openWithdraw==='function'&&!window.__cashArrowWithdrawHook){
      const original=window.openWithdraw;window.openWithdraw=function(){const s=el('withdrawSection');if(s)s.dataset.cashArrowOpen='1';const r=original.apply(this,arguments);if(s)s.style.display='block';arrange();if(s)s.scrollIntoView({behavior:'smooth',block:'nearest'});return r;};window.__cashArrowWithdrawHook=true;
    }
    if(typeof window.closeWithdraw==='function'&&!window.__cashArrowCloseWithdrawHook){
      const original=window.closeWithdraw;window.closeWithdraw=function(){const s=el('withdrawSection');if(s)delete s.dataset.cashArrowOpen;const r=original.apply(this,arguments);arrange();return r;};window.__cashArrowCloseWithdrawHook=true;
    }
    if(typeof window.openDeposit==='function'&&!window.__cashArrowDepositHook){
      const original=window.openDeposit;window.openDeposit=function(){const r=original.apply(this,arguments);arrange();const s=el('casharrowDeposit');if(s&&visible(s))s.scrollIntoView({behavior:'smooth',block:'nearest'});return r;};window.__cashArrowDepositHook=true;
    }
  }

  function start(){
    arrange();hookButtons();
    const home=document.querySelector('.bottom .nav');if(home&&!home.dataset.cashArrowHome){home.dataset.cashArrowHome='1';home.onclick=goHome;}
    const container=document.querySelector('main.container');
    if(container&&!window.__cashArrowCompactObserver){window.__cashArrowCompactObserver=new MutationObserver(()=>{arrange();hookButtons();});window.__cashArrowCompactObserver.observe(container,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;
    body = body.replace("</body>", `${compactUI}</body>`);
  }
  return originalSend.call(this, body);
};

// Export the Express app before loading the authoritative rental/financial wrapper.
module.exports = app;

if (require.main === module) {
  require("./server-with-rentals-v4");
}
