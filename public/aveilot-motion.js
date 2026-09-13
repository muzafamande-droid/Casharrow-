(()=>{
'use strict';
const STYLE_ID='aveilot-motion-style-v2';
if(!document.getElementById(STYLE_ID)){
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
/* AVEILOT MOTION SYSTEM — preserves the existing layout */
.ah-wrap{position:relative;isolation:isolate;background:#f7f9fc;}
.ah-wrap::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-2;background:radial-gradient(circle at 15% 10%,rgba(32,157,255,.12),transparent 25%),radial-gradient(circle at 88% 42%,rgba(72,121,255,.09),transparent 30%);animation:aveilotAtmosphere 9s ease-in-out infinite alternate;}
.ah-wrap::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;opacity:.22;background-image:linear-gradient(rgba(19,103,182,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(19,103,182,.08) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(to bottom,black,transparent 78%);animation:aveilotGrid 14s linear infinite;}
.ah-top{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:aveilotDrop .7s cubic-bezier(.2,.8,.2,1) both;}
.ah-logo{position:relative;animation:aveilotLogo 3.2s ease-in-out infinite;}
.ah-logo::after{content:"";position:absolute;inset:-5px;border:1px solid rgba(36,154,255,.35);border-radius:13px;animation:aveilotRing 2.4s ease-out infinite;}
.ah-hero{overflow:hidden;}
.ah-hero::before{content:"";position:absolute;width:240px;height:240px;right:-75px;top:-85px;border-radius:50%;border:1px solid rgba(22,133,199,.18);box-shadow:0 0 55px rgba(28,157,239,.12),inset 0 0 35px rgba(28,157,239,.08);animation:aveilotOrbit 11s linear infinite;}
.ah-hero::after{content:"";position:absolute;width:9px;height:9px;right:83px;top:62px;border-radius:50%;background:#35c9ff;box-shadow:0 0 18px #35c9ff;animation:aveilotDot 4.5s ease-in-out infinite;}
.ah-kicker{animation:aveilotRise .7s .08s both;}
.ah-hero h1{animation:aveilotRise .85s .16s both;}
.ah-hero p{animation:aveilotRise .85s .25s both;}
.ah-hero-actions{animation:aveilotRise .85s .34s both;}
.ah-trust{animation:aveilotRise .85s .43s both;}
.ah-showcase{position:relative;}
.ah-section-head{animation:aveilotRise .75s .12s both;}
.ah-machine{position:relative;transform:translateY(0);transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s,border-color .35s;animation:aveilotCardIn .8s both;}
.ah-machine:nth-child(1){animation-delay:.12s}.ah-machine:nth-child(2){animation-delay:.2s}.ah-machine:nth-child(3){animation-delay:.28s}.ah-machine:nth-child(4){animation-delay:.36s}.ah-machine:nth-child(5){animation-delay:.44s}
.ah-machine::before{content:"";position:absolute;inset:-1px;border-radius:19px;pointer-events:none;background:linear-gradient(120deg,transparent 20%,rgba(65,188,255,.42),transparent 58%);transform:translateX(-130%);animation:aveilotShine 5.8s ease-in-out infinite;z-index:2;}
.ah-machine:hover,.ah-machine:active{transform:translateY(-8px) scale(1.015);box-shadow:0 18px 38px rgba(23,75,125,.14);border-color:#a9d7f4;}
.ah-photo{position:relative;overflow:hidden;}
.ah-photo img{transition:transform .8s cubic-bezier(.2,.8,.2,1),filter .8s;}
.ah-machine:hover .ah-photo img,.ah-machine:active .ah-photo img{transform:scale(1.07);filter:saturate(1.08) contrast(1.03);}
.ah-machine-glow{animation:aveilotPulse 2.8s ease-in-out infinite;}
.ah-benefits>div{transition:transform .35s,background .35s;}
.ah-benefits>div:hover{transform:translateY(-4px);background:#fff;}
.ah-final{position:relative;overflow:hidden;animation:aveilotFinal 1s .2s both;}
.ah-final::before{content:"";position:absolute;width:170px;height:170px;right:-45px;top:-65px;border-radius:50%;border:1px solid rgba(7,87,232,.16);animation:aveilotOrbit 8s linear infinite reverse;}
.ah-primary{position:relative;overflow:hidden;transition:transform .25s,box-shadow .25s;}
.ah-primary::after{content:"";position:absolute;top:0;bottom:0;width:60px;left:-80px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:aveilotButtonSweep 3.8s ease-in-out infinite;}
.ah-primary:hover,.ah-primary:active{transform:translateY(-3px) scale(1.02);box-shadow:0 14px 30px rgba(7,87,232,.3);}
@keyframes aveilotAtmosphere{from{transform:scale(1) translate3d(0,0,0);opacity:.72}to{transform:scale(1.08) translate3d(0,-10px,0);opacity:1}}
@keyframes aveilotGrid{from{background-position:0 0,0 0}to{background-position:0 44px,44px 0}}
@keyframes aveilotDrop{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
@keyframes aveilotRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes aveilotCardIn{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes aveilotLogo{0%,100%{box-shadow:0 0 0 rgba(38,168,255,0)}50%{box-shadow:0 0 24px rgba(38,168,255,.42)}}
@keyframes aveilotRing{0%{transform:scale(.9);opacity:.8}70%,100%{transform:scale(1.35);opacity:0}}
@keyframes aveilotOrbit{to{transform:rotate(360deg)}}
@keyframes aveilotDot{0%,100%{transform:translate(0,0);opacity:.7}50%{transform:translate(-36px,42px);opacity:1}}
@keyframes aveilotPulse{0%,100%{transform:scale(.94);opacity:.72}50%{transform:scale(1.08);opacity:1}}
@keyframes aveilotShine{0%,55%{transform:translateX(-130%)}75%,100%{transform:translateX(140%)}}
@keyframes aveilotButtonSweep{0%,55%{left:-80px}75%,100%{left:130%}}
@keyframes aveilotFinal{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.ah-wrap::before,.ah-wrap::after,.ah-top,.ah-logo,.ah-logo::after,.ah-hero::before,.ah-hero::after,.ah-kicker,.ah-hero h1,.ah-hero p,.ah-hero-actions,.ah-trust,.ah-section-head,.ah-machine,.ah-machine::before,.ah-machine-glow,.ah-final,.ah-final::before,.ah-primary::after{animation:none!important}.ah-machine,.ah-machine:hover,.ah-machine:active{transform:none!important}}
`;
 document.head.appendChild(style);
}
function addMotion(){
 const root=document.querySelector('.ah-wrap');
 if(!root||root.dataset.motionReady==='1')return;
 root.dataset.motionReady='1';
 const grid=document.getElementById('ahGrid');
 if(grid)grid.querySelectorAll('.ah-machine').forEach((el,i)=>{el.style.animationDelay=(.1+i*.09)+'s'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addMotion,{once:true});else addMotion();
new MutationObserver(addMotion).observe(document.documentElement,{childList:true,subtree:true});
})();
