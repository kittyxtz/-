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
