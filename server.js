const express = require("express");

// Keep the existing CashArrow backend and add a compact, working member dashboard shell.
const app = require("./server-legacy");

const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    const compactUI = `
<style id="casharrowCompactUI">
body.ca-member-compact main.container > .cardbox:first-child{display:none!important}
body.ca-member-compact main.container > #memberTools{display:none!important}
body.ca-member-compact #rewardsSection{display:none!important}
body.ca-member-compact #teamSection{display:none!important}
body.ca-member-compact #todayTasks{display:none}
body.ca-member-compact #withdrawSection,body.ca-member-compact #transactions{display:none}
body.ca-member-compact #casharrowMyRentals{margin:0 0 12px}
body.ca-member-compact #rentalCatalog{margin-top:10px}
body.ca-member-compact .section-title{font-size:18px;margin:16px 0 8px}
body.ca-member-compact #userWallet{margin-bottom:12px}
body.ca-member-compact #casharrowDeposit{margin-bottom:12px}
</style>
<script>
(() => {
  if (window.__cashArrowCompactLoaded) return;
  window.__cashArrowCompactLoaded = true;

  const el = id => document.getElementById(id);
  const member = () => !!localStorage.getItem('casharrowToken');
  const visible = node => !!node && getComputedStyle(node).display !== 'none';
  const navs = () => document.querySelectorAll('.bottom .nav');

  function activate(index){
    navs().forEach(n => n.classList.remove('active'));
    const n = navs()[index];
    if(n) n.classList.add('active');
  }

  function placeAfter(anchor,node){
    if(!anchor || !node || anchor === node) return node || anchor;
    if(anchor.nextElementSibling !== node) anchor.insertAdjacentElement('afterend',node);
    return node;
  }

  function arrange(){
    const isMember = member();
    document.body.classList.toggle('ca-member-compact',isMember);
    if(!isMember) return;

    const wallet=el('userWallet');
    const deposit=el('casharrowDeposit');
    const withdraw=el('withdrawSection');
    const tx=el('transactions');
    const rentals=el('casharrowMyRentals');
    const catalog=el('rentalCatalog');
    if(!wallet) return;

    let anchor=wallet;
    if(visible(deposit)) anchor=placeAfter(anchor,deposit);
    if(visible(withdraw)) anchor=placeAfter(anchor,withdraw);
    if(visible(tx)) anchor=placeAfter(anchor,tx);
    if(visible(rentals)) anchor=placeAfter(anchor,rentals);
    if(visible(catalog)) placeAfter(anchor,catalog);

    if(deposit && !visible(deposit)) deposit.style.display='none';
    if(withdraw && !withdraw.dataset.cashArrowOpen) withdraw.style.display='none';
    if(tx && !tx.dataset.cashArrowOpen) tx.style.display='none';

    if(typeof window.cashArrowRefreshRentals==='function' && !window.__cashArrowInitialRentals){
      window.__cashArrowInitialRentals=true;
      window.cashArrowRefreshRentals();
    }
  }

  function goHome(){
    ['todayTasks','rewardsSection','teamSection','memberTools'].forEach(id=>{
      const node=el(id);
      if(node) node.style.display='none';
    });
    const wallet=el('userWallet');
    if(wallet){
      wallet.style.display='block';
      wallet.scrollIntoView({behavior:'smooth',block:'start'});
    }
    activate(0);
    arrange();
  }

  function goWallet(){
    const wallet=el('userWallet');
    if(wallet){
      wallet.style.display='block';
      wallet.scrollIntoView({behavior:'smooth',block:'start'});
    }
    activate(2);
    arrange();
  }

  function goTasks(){
    if(!member()){
      if(typeof openModal==='function') openModal('login');
      return;
    }
    const tasks=el('todayTasks');
    const team=el('teamSection');
    if(tasks) tasks.style.display='block';
    if(team) team.style.display='block';
    activate(1);
    if(tasks) tasks.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function goTeam(){
    goTasks();
    const team=el('teamSection');
    if(team) team.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function goRewards(){
    if(!member()){
      if(typeof openModal==='function') openModal('login');
      return;
    }
    const rewards=el('rewardsSection');
    if(rewards) rewards.style.display='block';
    if(rewards) rewards.scrollIntoView({behavior:'smooth',block:'start'});
  }

  window.goToHome=goHome;
  window.goToWallet=goWallet;
  window.goToTasks=goTasks;
  window.goToTeam=goTeam;
  window.goToRewards=goRewards;

  function hookButtons(){
    if(typeof window.loadTransactions==='function' && !window.__cashArrowTransactionsHook){
      const original=window.loadTransactions;
      window.loadTransactions=async function(){
        const tx=el('transactions');
        if(tx){tx.dataset.cashArrowOpen='1';tx.style.display='block';}
        arrange();
        if(tx) tx.scrollIntoView({behavior:'smooth',block:'start'});
        try{return await original.apply(this,arguments);}
        finally{if(tx) tx.style.display='block';}
      };
      window.__cashArrowTransactionsHook=true;
    }

    if(typeof window.openWithdraw==='function' && !window.__cashArrowWithdrawHook){
      const original=window.openWithdraw;
      window.openWithdraw=function(){
        const section=el('withdrawSection');
        if(section) section.dataset.cashArrowOpen='1';
        const result=original.apply(this,arguments);
        if(section) section.style.display='block';
        arrange();
        if(section) section.scrollIntoView({behavior:'smooth',block:'start'});
        return result;
      };
      window.__cashArrowWithdrawHook=true;
    }

    if(typeof window.closeWithdraw==='function' && !window.__cashArrowCloseWithdrawHook){
      const original=window.closeWithdraw;
      window.closeWithdraw=function(){
        const section=el('withdrawSection');
        if(section) delete section.dataset.cashArrowOpen;
        const result=original.apply(this,arguments);
        arrange();
        return result;
      };
      window.__cashArrowCloseWithdrawHook=true;
    }

    if(typeof window.openDeposit==='function' && !window.__cashArrowDepositHook){
      const original=window.openDeposit;
      window.openDeposit=function(){
        const result=original.apply(this,arguments);
        arrange();
        const section=el('casharrowDeposit');
        if(section && visible(section)) section.scrollIntoView({behavior:'smooth',block:'start'});
        return result;
      };
      window.__cashArrowDepositHook=true;
    }
  }

  function start(){
    arrange();
    hookButtons();

    const allNavs=navs();
    if(allNavs[0] && !allNavs[0].dataset.cashArrowHome){
      allNavs[0].dataset.cashArrowHome='1';
      allNavs[0].onclick=goHome;
    }
    if(allNavs[1] && !allNavs[1].dataset.cashArrowTasks){
      allNavs[1].dataset.cashArrowTasks='1';
      allNavs[1].onclick=goTasks;
    }
    if(allNavs[2] && !allNavs[2].dataset.cashArrowWallet){
      allNavs[2].dataset.cashArrowWallet='1';
      allNavs[2].onclick=goWallet;
    }

    const container=document.querySelector('main.container');
    if(container && !window.__cashArrowCompactObserver){
      window.__cashArrowCompactObserver=new MutationObserver(()=>{
        arrange();
        hookButtons();
      });
      window.__cashArrowCompactObserver.observe(container,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
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
