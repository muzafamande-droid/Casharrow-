(()=> {
  if(window.__aveilotAuthUx)return;
  window.__aveilotAuthUx=true;
  const byId=id=>document.getElementById(id);
  function addStyle(){if(byId('aveilot-auth-ux-style'))return;const s=document.createElement('style');s.id='aveilot-auth-ux-style';s.textContent=`
  .ca-password-wrap{position:relative;margin-top:9px}.ca-password-wrap .field{margin-top:0;padding-right:72px}
  .ca-show-pass{position:absolute;right:8px;top:7px;border:0;background:#eef4ff;color:#0757e8;border-radius:9px;padding:7px 9px;font-size:11px;font-weight:800}
  `;document.head.appendChild(s)}
  function toggle(id,label){const input=byId(id);if(!input||input.parentElement.classList.contains('ca-password-wrap'))return;const w=document.createElement('div');w.className='ca-password-wrap';input.parentNode.insertBefore(w,input);w.appendChild(input);const b=document.createElement('button');b.type='button';b.className='ca-show-pass';b.textContent='Show';b.setAttribute('aria-label',label+' visibility');b.onclick=()=>{const v=input.type==='text';input.type=v?'password':'text';b.textContent=v?'Show':'Hide'};w.appendChild(b)}
  function phone(){['registerPhone','loginPhone'].forEach(id=>{const i=byId(id);if(!i)return;i.inputMode='tel';i.autocomplete='tel';i.placeholder='Phone number (e.g. 07XXXXXXXX)'})}
  function enter(){['registerName','registerPhone','registerPassword','registerConfirmPassword'].forEach(id=>{const i=byId(id);if(!i||i.dataset.aveilotEnter)return;i.dataset.aveilotEnter='1';i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window.register?.()}})});['loginPhone','loginPassword'].forEach(id=>{const i=byId(id);if(!i||i.dataset.aveilotEnter)return;i.dataset.aveilotEnter='1';i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window.login?.()}})})}
  function start(){addStyle();phone();toggle('registerPassword','Password');toggle('registerConfirmPassword','Confirm password');toggle('loginPassword','Password');enter()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();