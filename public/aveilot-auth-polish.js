(()=>{
  const css=`
  .aveilot-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .aveilot-auth-logo{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(145deg,#087cff,#16c8ff 55%,#5b5cff);box-shadow:inset 2px 2px 5px rgba(255,255,255,.7),inset -4px -4px 8px rgba(0,50,150,.25),0 10px 24px rgba(7,87,232,.25);color:#fff;font-size:27px;font-weight:1000;transform:perspective(80px) rotateX(4deg)}
  .aveilot-auth-word{font-size:23px;font-weight:1000;letter-spacing:1.2px;background:linear-gradient(90deg,#0757e8,#08a9ff,#5b5cff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .aveilot-auth-tag{font-size:11px;color:#718096;margin-top:2px;letter-spacing:.3px}
  .modal-card.aveilot-auth-card{border:1px solid rgba(110,160,235,.25);box-shadow:0 28px 80px rgba(2,40,100,.28),inset 0 1px 0 #fff;background:linear-gradient(145deg,#fff,#f7fbff)}
  .modal-card.aveilot-auth-card:before{content:"";position:absolute;inset:-1px;border-radius:25px;pointer-events:none;background:linear-gradient(135deg,rgba(19,164,255,.22),transparent 35%,rgba(91,92,255,.13));z-index:-1}
  .aveilot-auth-card .field{background:rgba(255,255,255,.92);border-color:#d6e3f3;box-shadow:inset 0 2px 5px rgba(20,60,120,.035)}
  .aveilot-auth-card .field:focus{box-shadow:0 0 0 3px rgba(8,124,255,.11),inset 0 2px 5px rgba(20,60,120,.03)}
  .aveilot-auth-card .primary{background:linear-gradient(135deg,#0757e8,#13a4ff 60%,#5b5cff)!important;box-shadow:0 9px 20px rgba(7,87,232,.22);transition:transform .15s,box-shadow .15s}
  .aveilot-auth-card .primary:active{transform:translateY(1px);box-shadow:0 5px 12px rgba(7,87,232,.2)}
  .aveilot-auth-badge{display:inline-flex;align-items:center;gap:5px;margin:2px 0 12px;padding:6px 9px;border-radius:999px;background:#eef7ff;color:#0757e8;font-size:10px;font-weight:900}
  `;
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  function enhance(){const card=document.querySelector('#authModal .modal-card');if(!card||card.classList.contains('aveilot-auth-card'))return;card.classList.add('aveilot-auth-card');['loginForm','registerForm'].forEach(id=>{const form=document.getElementById(id);if(!form||form.querySelector('.aveilot-auth-brand'))return;const brand=document.createElement('div');brand.className='aveilot-auth-brand';brand.innerHTML='<div class="aveilot-auth-logo">A</div><div><div class="aveilot-auth-word">AVEILOT</div><div class="aveilot-auth-tag">Power. Rentals. Your way.</div></div>';form.prepend(brand);const badge=document.createElement('div');badge.className='aveilot-auth-badge';badge.textContent=id==='loginForm'?'🔐 Secure member access':'⚡ Create your AVEILOT account';const heading=form.querySelector('h2');if(heading)heading.before(badge);});}
  enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
})();
