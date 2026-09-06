(() => {
  if (window.__casharrowEnhancementsLoaded) return;
  window.__casharrowEnhancementsLoaded = true;

  const token = () => localStorage.getItem("casharrowToken");
  // Set this once the dedicated AVEILOT WhatsApp Business number is ready.
  const AVEILOT_SUPPORT_NUMBER = "";

  const style = document.createElement("style");
  style.textContent = `
    .casharrow-deposit{display:none;margin-top:24px}
    .casharrow-deposit .deposit-note{color:#7b8494;font-size:13px;line-height:1.45;margin:8px 0 16px}
    .casharrow-deposit .deposit-status{font-size:13px;margin-top:10px;min-height:18px}
    .casharrow-support{margin-top:12px;padding:14px;border-radius:16px;background:linear-gradient(135deg,#eef9f2,#fff);border:1px solid #cfe8d8}
    .casharrow-support-title{font-weight:900;font-size:15px}
    .casharrow-support-text{font-size:12px;color:#667085;line-height:1.45;margin:4px 0 9px}
    .casharrow-support button{width:100%;border:0;border-radius:11px;padding:12px;font-weight:900;background:#168a4b;color:#fff;cursor:pointer}
    #userWallet .actions{grid-template-columns:repeat(3,1fr)}
    .casharrow-hide-guest{display:none!important}
    .bottom{background:linear-gradient(135deg,#06142f 0%,#0a2c67 50%,#087cff 100%) !important;border-top:1px solid rgba(255,255,255,.16)!important;box-shadow:0 -10px 28px rgba(7,48,112,.22)!important}
    .bottom .nav{color:rgba(255,255,255,.78)!important}
    .bottom .nav.active{color:#fff!important;background:rgba(255,255,255,.16)!important}
    @media(max-width:520px){#userWallet .actions{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  function addConfirmPassword() {
    const password = document.getElementById("registerPassword");
    if (!password || document.getElementById("registerConfirmPassword")) return;
    const confirm = document.createElement("input");
    confirm.id = "registerConfirmPassword";
    confirm.type = "password";
    confirm.placeholder = "Confirm password";
    password.insertAdjacentElement("afterend", confirm);
  }

  function addSupportUI() {
    if (!token() || document.getElementById("aveilotSupport")) return;
    const wallet = document.getElementById("userWallet");
    if (!wallet) return;
    const section = document.createElement("section");
    section.className = "casharrow-support";
    section.id = "aveilotSupport";
    section.innerHTML = `
      <div class="casharrow-support-title">💬 AVEILOT Customer Support</div>
      <div class="casharrow-support-text">Need help with deposits, withdrawals, rentals or your account? Our support team is here to assist you.</div>
      <button type="button" id="aveilotSupportButton">💬 Chat with AVEILOT Support</button>
    `;
    wallet.insertAdjacentElement("afterend", section);
    document.getElementById("aveilotSupportButton").onclick = openSupport;
  }

  function openSupport() {
    if (AVEILOT_SUPPORT_NUMBER) {
      const number = AVEILOT_SUPPORT_NUMBER.replace(/\D/g, "");
      window.open(`https://wa.me/${number}?text=${encodeURIComponent("Hello AVEILOT Support, I need assistance with my account.")}`, "_blank", "noopener");
      return;
    }
    alert("AVEILOT Customer Support is being connected to WhatsApp Business. Please use the support channel provided by AVEILOT when it is available.");
  }

  function addDepositUI() {
    if (document.getElementById("casharrowDeposit") || !token()) return;
    const wallet = document.getElementById("userWallet");
    if (!wallet) return;
    const actions = wallet.querySelector(".actions");
    if (actions && !actions.querySelector("[data-casharrow-deposit]")) {
      const button = document.createElement("button");
      button.className = "primary";
      button.type = "button";
      button.textContent = "💳 Deposit";
      button.dataset.casharrowDeposit = "true";
      button.onclick = openDeposit;
      actions.insertBefore(button, actions.firstChild);
    }
    const section = document.createElement("section");
    section.className = "balance casharrow-deposit";
    section.id = "casharrowDeposit";
    section.innerHTML = `
      <small>💳 Deposit Funds</small>
      <h2 style="margin:12px 0 8px;">Add money to your AVEILOT wallet</h2>
      <p class="deposit-note">After you make your Mobile Money payment, enter the amount and the Mobile Money number you paid from, then tap <b>I HAVE PAID</b>. AVEILOT will verify the payment before crediting your balance.</p>
      <input type="number" id="depositAmount" placeholder="Amount (UGX)" min="1">
      <select id="depositNetwork"><option value="">Select network</option><option value="MTN">MTN Mobile Money</option><option value="Airtel">Airtel Money</option></select>
      <input type="text" id="depositAccount" inputmode="tel" autocomplete="tel" placeholder="Mobile Money number you are paying from">
      <div class="actions"><button class="primary" type="button" id="submitDepositButton">I HAVE PAID</button><button class="secondary" type="button" id="closeDepositButton">Cancel</button></div>
      <div class="deposit-status" id="depositStatus"></div>
    `;
    wallet.insertAdjacentElement("afterend", section);
    document.getElementById("submitDepositButton").onclick = submitDeposit;
    document.getElementById("closeDepositButton").onclick = closeDeposit;
  }

  function showDeposit(){
    const section=document.getElementById("casharrowDeposit");
    if(section) section.style.display="block";
  }
  function openDeposit(){
    if(!token()){openModal("login");return;}
    showDeposit();
    document.getElementById("casharrowDeposit")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function closeDeposit(){
    const section=document.getElementById("casharrowDeposit");
    if(section) section.style.display="none";
  }

  async function submitDeposit(){
    const authToken=token();
    if(!authToken){openModal("login");return;}
    const amount=Number(document.getElementById("depositAmount").value);
    const network=document.getElementById("depositNetwork").value;
    const account=document.getElementById("depositAccount").value.trim();
    const status=document.getElementById("depositStatus");
    if(!Number.isFinite(amount)||amount<=0){status.textContent="Enter a valid deposit amount.";status.style.color="#c62828";return;}
    if(!network){status.textContent="Please select MTN or Airtel.";status.style.color="#c62828";return;}
    if(!account){status.textContent="Enter the Mobile Money number you are paying from.";status.style.color="#c62828";return;}
    status.textContent="Submitting payment confirmation...";status.style.color="#1769ff";
    try{
      const response=await fetch("/api/deposits",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+authToken},body:JSON.stringify({amount,network,account})});
      const data=await response.json();
      if(!response.ok||!data.success){status.textContent=data.message||"Deposit request failed.";status.style.color="#c62828";return;}
      status.textContent="✅ Payment confirmation submitted. Your balance will update after AVEILOT verifies and approves the deposit.";status.style.color="#0a8f52";
      document.getElementById("depositAmount").value="";
      document.getElementById("depositAccount").value="";
      document.getElementById("depositNetwork").value="";
    }catch(error){status.textContent="Unable to connect to AVEILOT server.";status.style.color="#c62828";}
  }

  function addLogoutControl(){
    const navs=document.querySelectorAll(".bottom .nav");
    const accountNav=navs[navs.length-1];
    if(!accountNav)return;
    accountNav.onclick=handleAccountAction;
    const label=accountNav.childNodes[accountNav.childNodes.length-1];
    if(label&&label.nodeType===Node.TEXT_NODE) label.textContent=token()?"Logout":"Account";
  }
  function handleAccountAction(){
    if(token()){if(confirm("Log out of AVEILOT?"))logout();return;}
    openModal("login");
  }
  function logout(){
    localStorage.removeItem("casharrowToken");
    localStorage.removeItem("casharrowUser");
    sessionStorage.removeItem("casharrowPendingReferral");
    window.location.reload();
  }

  const originalRegister=window.register;
  if(typeof originalRegister==="function"){
    window.register=async function(){
      const password=document.getElementById("registerPassword")?.value||"";
      const confirmPassword=document.getElementById("registerConfirmPassword")?.value||"";
      if(!confirmPassword){showMessage("registerMessage","Please confirm your password.");return;}
      if(password!==confirmPassword){showMessage("registerMessage","Passwords do not match.");return;}
      return originalRegister();
    };
  }

  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init={}){
    const url=typeof input==="string"?input:input?.url||"";
    if(url.endsWith("/api/register")&&init.body){
      try{
        const body=JSON.parse(init.body);
        body.confirmPassword=document.getElementById("registerConfirmPassword")?.value||"";
        init={...init,body:JSON.stringify(body)};
      }catch(error){}
    }
    return originalFetch(input,init);
  };

  function memberUser(){
    try{return JSON.parse(localStorage.getItem("casharrowUser")||"null")||{};}catch{return {};}
  }

  function restoreReferralTasks(){
    if(!token()) return;
    const tasks=document.getElementById("todayTasks");
    if(!tasks || document.getElementById("casharrowReferralTask")) return;
    const user=memberUser();
    const code=user.referralCode || user.referral_code || "";
    const section=document.createElement("div");
    section.id="casharrowReferralTask";
    section.className="task";
    section.style.display="block";
    const link=code ? location.origin+"/?ref="+encodeURIComponent(code) : "";
    section.innerHTML=`<div><b>🔗 Invite friends</b><div class="small" style="margin-top:6px">Referral code: <b>${code||"Loading..."}</b></div><div class="small" style="margin-top:4px">Earn UGX 5,000 when an eligible friend joins with your code.</div></div><button class="secondary" type="button" id="casharrowCopyReferral">Copy</button>`;
    tasks.appendChild(section);
    const copy=section.querySelector("#casharrowCopyReferral");
    copy.onclick=async()=>{
      if(!link){copy.textContent="No code";return;}
      try{await navigator.clipboard.writeText(link);copy.textContent="Copied";}catch{prompt("Copy your referral link:",link);}
      setTimeout(()=>copy.textContent="Copy",1600);
    };
  }

  function openTasks(){
    if(!token()){openModal("login");return;}
    const tasks=document.getElementById("todayTasks");
    const team=document.getElementById("teamSection");
    if(tasks) tasks.style.display="block";
    if(team) team.style.display="block";
    restoreReferralTasks();
    tasks?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function home(){
    const wallet=document.getElementById("userWallet");
    ["todayTasks","rewardsSection","teamSection","memberTools","casharrowDeposit","withdrawSection","transactions"].forEach(id=>{
      const n=document.getElementById(id); if(n && id!=="userWallet") { n.style.display="none"; if(id==="withdrawSection"||id==="transactions") delete n.dataset.cashArrowOpen; }
    });
    if(wallet){wallet.style.display="block";wallet.scrollIntoView({behavior:"smooth",block:"start"});}
    document.querySelectorAll(".bottom .nav").forEach((n,i)=>n.classList.toggle("active",i===0));
    if(typeof window.cashArrowRefreshRentals==="function") window.cashArrowRefreshRentals();
  }

  function wallet(){
    const w=document.getElementById("userWallet");
    if(w){w.style.display="block";w.scrollIntoView({behavior:"smooth",block:"start"});}
    document.querySelectorAll(".bottom .nav").forEach((n,i)=>n.classList.toggle("active",i===2));
  }

  function captureNavigation(){
    document.addEventListener("click",event=>{
      const button=event.target.closest(".bottom .nav, #userWallet button");
      if(!button) return;
      const navs=[...document.querySelectorAll(".bottom .nav")];
      const index=navs.indexOf(button);
      if(index===0){event.preventDefault();event.stopImmediatePropagation();home();return;}
      if(index===1){event.preventDefault();event.stopImmediatePropagation();openTasks();return;}
      if(index===2){event.preventDefault();event.stopImmediatePropagation();wallet();return;}
      if(button.closest("#userWallet")){
        const text=(button.textContent||"").toLowerCase();
        if(text.includes("withdraw")){event.preventDefault();event.stopImmediatePropagation();if(typeof window.openWithdraw==="function")window.openWithdraw();return;}
        if(text.includes("transaction")){event.preventDefault();event.stopImmediatePropagation();if(typeof window.loadTransactions==="function")window.loadTransactions();return;}
        if(text.includes("deposit")){event.preventDefault();event.stopImmediatePropagation();openDeposit();return;}
      }
    },true);
  }

  document.addEventListener("DOMContentLoaded",()=>{
    addConfirmPassword();
    if(token()){
      addDepositUI();
      addSupportUI();
    }
    addLogoutControl();
    captureNavigation();
    restoreReferralTasks();
  });
})();
