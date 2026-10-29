'use strict';
(() => {
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  const key=`sozvon-scroll:${location.pathname}`;
  let saved=0,ready=false,pending=false;
  try{saved=Number(sessionStorage.getItem(key))||0;}catch{}
  function save(){if(!ready)return;try{sessionStorage.setItem(key,String(window.scrollY));}catch{}}
  addEventListener('scroll',()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;save();});},{passive:true});
  addEventListener('pagehide',save);
  addEventListener('pageshow',event=>{
    if(event.persisted){ready=true;return;}
    document.fonts.ready.then(()=>requestAnimationFrame(()=>{
      const kind=performance.getEntriesByType('navigation')[0]?.type;
      if(kind==='reload'||kind==='back_forward')window.scrollTo({top:saved,behavior:'instant'});
      ready=true;save();
    }));
  });
})();

document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-copyright-year]').forEach(node=>{node.textContent=String(new Date().getFullYear());});});

// Keep validation in the layout while its measured height eases open and closed.
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.field input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=time])').forEach(input=>{
    if(input.closest('.copy-control,.input-shell'))return;
    const shell=document.createElement('span');shell.className='input-shell';
    const isPerson=/display-name|profile-name/.test(input.id),isLink=/code|link/.test(input.id);
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
    icon.innerHTML=isPerson?'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>':isLink?'<path d="m10 14 4-4m-5 6-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m0 10a4.2 4.2 0 0 0 6 0l4-4a4.2 4.2 0 0 0-6-6l-1 1"/>':'<path d="M5 7h14M5 12h10M5 17h7"/>';
    input.before(shell);shell.append(icon,input);
  });
  document.querySelectorAll('.field-error').forEach(message=>{
    const slot=document.createElement('div');slot.className='field-error-slot';
    message.before(slot);slot.append(message);message.dataset.smoothError='';
    const update=()=>{
      const visible=!message.hidden&&!!message.textContent.trim();
      const gap=parseFloat(getComputedStyle(slot.parentElement).rowGap)||0;
      slot.style.height=visible?`${message.scrollHeight}px`:'0px';
      slot.style.marginBlockStart=visible?'0px':`${-gap}px`;
      slot.style.opacity=visible?'1':'0';slot.inert=!visible;
      slot.setAttribute('aria-hidden',String(!visible));
    };
    update();requestAnimationFrame(()=>slot.classList.add('is-ready'));
    new MutationObserver(update).observe(message,{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true});
    new ResizeObserver(update).observe(message);
  });
});

// A short inward press confirms activation without lifting the control.
(() => {
  const presses=new WeakMap();
  document.addEventListener('click',event=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const control=event.target.closest?.('button,summary,a.primary-button');
    if(!control||control.matches('summary')||control.disabled||!control.isConnected||control.closest('.month-ghost,.scenario-ghost'))return;
    const target=control.matches('.month-day')?control.querySelector('.month-day-number'):control.matches('[role=tab]')?control.querySelector('.scenario-number>span'):control;
    if(!target)return;
    presses.get(target)?.cancel();
    const animation=target.animate([{scale:'1'},{scale:control.classList.contains('primary-button')?'.975':'.96',offset:.35},{scale:'1'}],{duration:200,easing:'cubic-bezier(.2,0,0,1)'});
    presses.set(target,animation);
  });
})();
