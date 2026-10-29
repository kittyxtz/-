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
