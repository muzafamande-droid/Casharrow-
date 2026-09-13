(()=>{
'use strict';
function hideGuestMachines(){
  const section=document.getElementById('ahMachines');
  if(section) section.remove();
  document.querySelectorAll('.ah-showcase,.ah-section-head').forEach(el=>el.remove());
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hideGuestMachines,{once:true});
else hideGuestMachines();
new MutationObserver(hideGuestMachines).observe(document.documentElement,{childList:true,subtree:true});
})();
