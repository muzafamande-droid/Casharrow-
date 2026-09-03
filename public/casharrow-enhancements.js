(() => {
  if (window.__casharrowEnhancementsLoaded) return;
  window.__casharrowEnhancementsLoaded = true;

  const token = () => localStorage.getItem("casharrowToken");

  const style = document.createElement("style");
  style.textContent = `
    .casharrow-deposit{display:none;margin-top:24px}
    .casharrow-deposit .deposit-note{color:#7b8494;font-size:13px;line-height:1.45;margin:8px 0 16px}
    .casharrow-deposit .deposit-status{font-size:13px;margin-top:10px;min-height:18px}
    #userWallet .actions{grid-template-columns:repeat(3,1fr)}
    .casharrow-guest-home{display:none;text-align:center;padding:22px 4px 10px}
    .casharrow-guest-home h2{font-size:24px;margin-bottom:8px;color:#07162f}
    .casharrow-guest-home p{font-size:13px;line-height:1.5;color:#718096;max-width:420px;margin:0 auto 18px}
    .casharrow-guest-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .casharrow-guest-actions button{width:100%}
    .casharrow-guest-deposit{grid-column:1/-1;background:linear-gradient(135deg,#07162f 0%,#0b3d86 58%,#087cff 100%);color:#fff;box-shadow:0 8px 20px rgba(7,48,112,.2)}
    .casharrow-products{margin-top:18px}
    .casharrow-products-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}
    .casharrow-products-head h2{font-size:21px;color:#07162f}
    .casharrow-products-head span{font-size:11px;color:#718096}
    .casharrow-product-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .casharrow-product{background:#fff;border:1px solid rgba(17,76,160,.07);border-radius:20px;overflow:hidden;box-shadow:0 8px 22px rgba(17,45,88,.07)}
    .casharrow-product img{display:block;width:100%;aspect-ratio:1.45;object-fit:cover;background:#07162f}
    .casharrow-product-body{padding:14px}
    .casharrow-product h3{font-size:15px;margin-bottom:6px;color:#172033}
    .casharrow-product p{font-size:12px;line-height:1.45;color:#718096;min-height:34px}
    .casharrow-product-price{font-size:17px;font-weight:800;color:#0757e8;margin:10px 0 3px}
    .casharrow-product-period{font-size:11px;color:#718096;margin-bottom:10px}
    .casharrow-product button{width:100%}
    .casharrow-coming{background:#f3f6fb!important;color:#718096!important;box-shadow:none!important;cursor:default!important}
    .casharrow-member-products{margin-top:24px}
    .casharrow-member-products .casharrow-product-grid{grid-template-columns:repeat(2,1fr)}
    .casharrow-member-products .casharrow-product{min-width:0}
    .casharrow-member-products .casharrow-product-body{padding:13px}
    .casharrow-member-products .casharrow-product img{aspect-ratio:1.55}
    .casharrow-member-products .casharrow-product button{font-size:12px;padding:11px}
    .casharrow-auth-note{font-size:11px;color:#718096;text-align:center;margin-top:10px}
    .casharrow-hide-guest{display:none!important}
    .bottom{background:linear-gradient(135deg,#06142f 0%,#0a2c67 50%,#087cff 100%) !important;border-top:1px solid rgba(255,255,255,.16)!important;box-shadow:0 -10px 28px rgba(7,48,112,.22)!important}
    .bottom .nav{color:rgba(255,255,255,.78)!important}
    .bottom .nav.active{color:#fff!important;background:rgba(255,255,255,.16)!important}
    .bottom .nav div{filter:drop-shadow(0 2px 5px rgba(0,0,0,.18))}
    @media(max-width:520px){
      #userWallet .actions{grid-template-columns:1fr 1fr}
      .casharrow-guest-home{padding-top:16px}
      .casharrow-guest-actions{grid-template-columns:1fr}
      .casharrow-product-grid,.casharrow-member-products .casharrow-product-grid{grid-template-columns:1fr 1fr}
      .casharrow-product-body{padding:11px}
      .casharrow-product h3{font-size:14px}
      .casharrow-product p{font-size:11px}
      .casharrow-product-price{font-size:15px}
    }
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

  function productMarkup(buttonLabel = "Login to rent", disabled = false) {
    const buttonClass = disabled ? "secondary casharrow-coming" : "primary";
    const buttonText = disabled ? "Coming soon" : buttonLabel;
    return `
      <article class="casharrow-product">
        <img src="/product-placeholder.svg" alt="CashArrow rental product">
        <div class="casharrow-product-body">
          <h3>CashArrow Product 01</h3>
          <p>30-day rental product. Full product details and rental terms are shown before confirmation.</p>
          <div class="casharrow-product-price">UGX 100,000</div>
          <div class="casharrow-product-period">30 days · Contract payout: UGX 850,000</div>
          <button class="${buttonClass}" type="button" ${disabled ? "disabled" : ""}>${buttonText}</button>
        </div>
      </article>
      <article class="casharrow-product">
        <img src="/product-placeholder.svg" alt="CashArrow rental product coming soon">
        <div class="casharrow-product-body">
          <h3>Product 02</h3>
          <p>More genuine rental products will appear here as they are added to CashArrow.</p>
          <div class="casharrow-product-price">Coming soon</div>
          <div class="casharrow-product-period">Product details will be published before launch.</div>
          <button class="secondary casharrow-coming" type="button" disabled>Coming soon</button>
        </div>
      </article>
      <article class="casharrow-product">
        <img src="/product-placeholder.svg" alt="CashArrow rental product coming soon">
        <div class="casharrow-product-body">
          <h3>Product 03</h3>
          <p>More genuine rental products will appear here as they are added to CashArrow.</p>
          <div class="casharrow-product-price">Coming soon</div>
          <div class="casharrow-product-period">Product details will be published before launch.</div>
          <button class="secondary casharrow-coming" type="button" disabled>Coming soon</button>
        </div>
      </article>
      <article class="casharrow-product">
        <img src="/product-placeholder.svg" alt="CashArrow rental product coming soon">
        <div class="casharrow-product-body">
          <h3>Product 04</h3>
          <p>More genuine rental products will appear here as they are added to CashArrow.</p>
          <div class="casharrow-product-price">Coming soon</div>
          <div class="casharrow-product-period">Product details will be published before launch.</div>
          <button class="secondary casharrow-coming" type="button" disabled>Coming soon</button>
        </div>
      </article>`;
  }

  function addGuestHome() {
    if (document.getElementById("casharrowGuestHome") || token()) return;
    const container = document.querySelector("main.container");
    if (!container) return;

    const balance = container.querySelector(".balance:not(#userWallet):not(#withdrawSection):not(#userTransactions)");
    if (balance) balance.style.display = "none";

    ["todayTasks","rewardsSection","teamSection"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("casharrow-hide-guest");
    });

    const guestHome = document.createElement("section");
    guestHome.className = "casharrow-guest-home";
    guestHome.id = "casharrowGuestHome";
    guestHome.innerHTML = `
      <h2>Welcome to CashArrow</h2>
      <p>Explore our rental products first. Create an account or log in to rent and manage your rentals.</p>
      <div class="casharrow-products">
        <div class="casharrow-products-head"><h2>Featured Products</h2><span>4 products</span></div>
        <div class="casharrow-product-grid">${productMarkup("Login to rent")}</div>
        <div class="casharrow-auth-note">Register or log in below to continue.</div>
      </div>
      <div class="casharrow-guest-actions" style="margin-top:18px;">
        <button class="casharrow-guest-deposit" type="button">💳 Deposit</button>
        <button class="primary" type="button">📝 Create Account</button>
        <button class="secondary" type="button">🔐 Login</button>
      </div>
    `;

    container.insertBefore(guestHome, container.firstElementChild);
    guestHome.style.display = "block";
    const buttons = guestHome.querySelectorAll("button");
    buttons[0].onclick = () => openModal("login");
    buttons[1].onclick = () => openModal("register");
    buttons[2].onclick = () => openModal("login");
    guestHome.querySelectorAll(".casharrow-product button:not(:disabled)").forEach(btn => {
      btn.onclick = () => openModal("login");
    });
  }

  function removeGuestHome() {
    document.getElementById("casharrowGuestHome")?.remove();
    const container = document.querySelector("main.container");
    const balance = container?.querySelector(".balance:not(#userWallet):not(#withdrawSection):not(#userTransactions)");
    if (balance) balance.style.display = "block";
    ["todayTasks","rewardsSection","teamSection"].forEach(id => document.getElementById(id)?.classList.remove("casharrow-hide-guest"));
  }

  function addMemberProducts() {
    if (!token() || document.getElementById("casharrowMemberProducts")) return;
    const container = document.querySelector("main.container");
    if (!container) return;
    const section = document.createElement("section");
    section.className = "casharrow-member-products";
    section.id = "casharrowMemberProducts";
    section.innerHTML = `
      <div class="casharrow-products-head"><h2>Rental Products</h2><span>Choose a product</span></div>
      <div class="casharrow-product-grid">${productMarkup("Rent product")}</div>
    `;
    const wallet = document.getElementById("userWallet");
    (wallet || container.firstElementChild)?.insertAdjacentElement("afterend", section);
    section.querySelector(".casharrow-product button:not(:disabled)").onclick = () => {
      alert("Rental checkout will be enabled when the rental server flow is added. Your wallet will only be charged after you confirm the rental.");
    };
  }

  function addDepositUI() {
    if (document.getElementById("casharrowDeposit") || !token()) return;
    const wallet = document.getElementById("userWallet");
    if (!wallet) return;
    const actions = wallet.querySelector(".actions");
    if (actions) {
      const button = document.createElement("button");
      button.className = "primary";
      button.type = "button";
      button.textContent = "💳 Deposit";
      button.onclick = openDeposit;
      actions.insertBefore(button, actions.firstChild);
    }
    const section = document.createElement("section");
    section.className = "balance casharrow-deposit";
    section.id = "casharrowDeposit";
    section.innerHTML = `
      <small>💳 Deposit Funds</small>
      <h2 style="margin:12px 0 8px;">Add money to your CashArrow wallet</h2>
      <p class="deposit-note">Submit your Mobile Money payment details here. Your balance is only credited after the deposit is verified and approved by CashArrow.</p>
      <input type="number" id="depositAmount" placeholder="Amount (UGX)" min="1">
      <select id="depositNetwork"><option value="">Select network</option><option value="MTN">MTN Mobile Money</option><option value="Airtel">Airtel Money</option></select>
      <input type="text" id="depositAccount" placeholder="Mobile Money phone number">
      <div class="actions"><button class="primary" type="button" id="submitDepositButton">Submit Deposit</button><button class="secondary" type="button" id="closeDepositButton">Cancel</button></div>
      <div class="deposit-status" id="depositStatus"></div>
    `;
    wallet.insertAdjacentElement("afterend", section);
    document.getElementById("submitDepositButton").onclick = submitDeposit;
    document.getElementById("closeDepositButton").onclick = closeDeposit;
  }

  function showDeposit(){document.getElementById("casharrowDeposit")?.style && (document.getElementById("casharrowDeposit").style.display="block");}
  function openDeposit(){if(!token()){openModal("login");return;}showDeposit();document.getElementById("casharrowDeposit")?.scrollIntoView({behavior:"smooth",block:"start"});}
  function closeDeposit(){const section=document.getElementById("casharrowDeposit");if(section)section.style.display="none";}

  async function submitDeposit(){
    const authToken=token(); if(!authToken){openModal("login");return;}
    const amount=Number(document.getElementById("depositAmount").value);
    const network=document.getElementById("depositNetwork").value;
    const account=document.getElementById("depositAccount").value.trim();
    const status=document.getElementById("depositStatus");
    if(!Number.isFinite(amount)||amount<=0){status.textContent="Enter a valid deposit amount.";status.style.color="#c62828";return;}
    if(!network){status.textContent="Please select MTN or Airtel.";status.style.color="#c62828";return;}
    if(!account){status.textContent="Enter your Mobile Money number.";status.style.color="#c62828";return;}
    status.textContent="Submitting deposit request...";status.style.color="#1769ff";
    try{
      const response=await fetch("/api/deposits",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+authToken},body:JSON.stringify({amount,network,account})});
      const data=await response.json();
      if(!response.ok||!data.success){status.textContent=data.message||"Deposit request failed.";status.style.color="#c62828";return;}
      status.textContent="✅ Deposit request submitted. Your balance will update after approval.";status.style.color="#0a8f52";
      document.getElementById("depositAmount").value="";document.getElementById("depositAccount").value="";document.getElementById("depositNetwork").value="";
    }catch(error){status.textContent="Unable to connect to CashArrow server.";status.style.color="#c62828";}
  }

  function addLogoutControl(){
    const navs=document.querySelectorAll(".bottom .nav");const accountNav=navs[navs.length-1];if(!accountNav)return;
    accountNav.onclick=handleAccountAction;
    const label=accountNav.childNodes[accountNav.childNodes.length-1];
    if(label&&label.nodeType===Node.TEXT_NODE)label.textContent=token()?"Logout":"Account";
  }
  function handleAccountAction(){if(token()){if(confirm("Log out of CashArrow?"))logout();return;}openModal("login");}
  function logout(){localStorage.removeItem("casharrowToken");localStorage.removeItem("casharrowUser");sessionStorage.removeItem("casharrowPendingReferral");window.location.reload();}

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
    if(url.endsWith("/api/register")&&init.body){try{const body=JSON.parse(init.body);body.confirmPassword=document.getElementById("registerConfirmPassword")?.value||"";init={...init,body:JSON.stringify(body)};}catch(error){}}
    return originalFetch(input,init);
  };

  document.addEventListener("DOMContentLoaded",()=>{
    addConfirmPassword();
    if(token()){
      removeGuestHome();
      addMemberProducts();
      addDepositUI();
    }else{
      addGuestHome();
    }
    addLogoutControl();
  });
})();
