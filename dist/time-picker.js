'use strict';
(() => {
  const dialog=document.createElement('div');dialog.className='time-picker-dialog';dialog.setAttribute('popover','auto');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-labelledby','time-picker-title');
  dialog.innerHTML='<div class="date-picker-heading"><h2 id="time-picker-title">Время встречи</h2><button type="button" class="icon-button" aria-label="Закрыть выбор времени"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 8 8 8m-8 0 8-8"/></svg></button></div><p class="time-picker-preview" aria-hidden="true">10:00</p><div class="time-wheels"><div><p id="time-hours-label">Часы</p><div class="time-wheel" id="time-hours" role="radiogroup" aria-labelledby="time-hours-label"></div></div><span class="time-colon" aria-hidden="true">:</span><div><p id="time-minutes-label">Минуты</p><div class="time-wheel" id="time-minutes" role="radiogroup" aria-labelledby="time-minutes-label"></div></div></div><div class="time-presets" aria-label="Удобное время"><button type="button" data-time="10:00">10:00</button><button type="button" data-time="14:00">14:00</button><button type="button" data-time="19:00">19:00</button></div><button type="button" class="primary-button time-picker-done">Выбрать время</button>';
  document.body.append(dialog);
  const controls=new Map(),pad=n=>String(n).padStart(2,'0'),C=window.SozvonCalendar;let active=null,hour=10,minute=0,ticker=null;
  const hours=dialog.querySelector('#time-hours'),minutes=dialog.querySelector('#time-minutes');
  function place(){if(!active||!dialog.matches(':popover-open'))return;const rect=controls.get(active).button.getBoundingClientRect(),width=Math.min(300,innerWidth-24);dialog.style.width=`${width}px`;dialog.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;dialog.style.top=`${rect.bottom+8}px`;dialog.style.maxHeight=`${Math.max(140,innerHeight-rect.bottom-20)}px`;}
  addEventListener('resize',place);addEventListener('scroll',place,{passive:true,capture:true});
  function minimum(input){const key=input?.dataset.date;if(!C.parseDay(key))return 0;const now=new Date(),today=C.dayKey(now);return key<today?1440:key>today?0:now.getHours()*60+now.getMinutes()+1;}
  function clamp(){const min=minimum(active);if(hour*60+minute<min&&min<1440){hour=Math.floor(min/60);minute=min%60;}}
  const wheelMotion=new Map();
  function center(root,value,smooth=false){
    const selected=root.children[value];if(!selected||selected.hidden)return;
    const prior=wheelMotion.get(root);if(prior)cancelAnimationFrame(prior.frame);wheelMotion.delete(root);
    const end=Math.max(0,selected.offsetTop-root.clientHeight/2+selected.clientHeight/2),start=root.scrollTop;
    if(!smooth||matchMedia('(prefers-reduced-motion: reduce)').matches||Math.abs(end-start)<.5){root.scrollTop=end;return;}
    const state={frame:0,start:performance.now()};wheelMotion.set(root,state);
    const frame=now=>{const progress=Math.min(1,(now-state.start)/260);root.scrollTop=start+(end-start)*(1-Math.pow(1-progress,3));if(progress<1)state.frame=requestAnimationFrame(frame);else wheelMotion.delete(root);};state.frame=requestAnimationFrame(frame);
  }
  function choose(root,part,value,focus=false){if(wheelMotion.has(root))return;const previousMinute=minute;if(part==='hour')hour=value;else minute=value;update();center(root,part==='hour'?hour:minute,true);if(part==='hour'&&previousMinute!==minute)center(minutes,minute);if(focus)root.children[value]?.focus({preventScroll:true});}
  function step(root,part,direction){const available=[...root.children].filter(b=>!b.hidden&&!b.disabled),current=part==='hour'?hour:minute,index=available.findIndex(b=>Number(b.dataset.value)===current),target=available[Math.max(0,Math.min(available.length-1,index+direction))];if(target)choose(root,part,Number(target.dataset.value),true);}
  function update(scroll=false){
    const min=minimum(active);clamp();
    dialog.querySelector('.time-picker-preview').textContent=min>=1440?'—:—':`${pad(hour)}:${pad(minute)}`;
    dialog.querySelector('.time-picker-done').disabled=min>=1440;
    for(const [root,value,part] of [[hours,hour,'hour'],[minutes,minute,'minute']]){
      for(const button of root.children){const n=Number(button.dataset.value),blocked=part==='hour'?(n+1)*60<=min:hour*60+n<min,selected=n===value;button.hidden=blocked;button.disabled=blocked;button.setAttribute('aria-checked',String(selected&&!blocked));button.tabIndex=selected&&!blocked?0:-1;}
      if(scroll&&!root.children[value]?.hidden)center(root,value);
    }
    for(const b of dialog.querySelectorAll('[data-time]')){const [h,m]=b.dataset.time.split(':').map(Number);b.disabled=h*60+m<min;}
  }
  for(const [root,max,part] of [[hours,24,'hour'],[minutes,60,'minute']]){
    for(let i=0;i<max;i++){
      const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=pad(i);b.dataset.value=i;b.setAttribute('aria-label',`${part==='hour'?'Часы':'Минуты'}: ${pad(i)}`);
      b.addEventListener('click',()=>choose(root,part,i));
      b.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();step(root,part,event.key==='ArrowDown'?1:-1);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();const available=[...root.children].filter(b=>!b.hidden&&!b.disabled),target=event.key==='Home'?available[0]:available[available.length-1];if(target)choose(root,part,Number(target.dataset.value),true);}});root.append(b);
    }
    let burst=false,quiet;
    root.addEventListener('wheel',event=>{event.preventDefault();clearTimeout(quiet);const already=burst;burst=true;quiet=setTimeout(()=>burst=false,180);if(!already&&Math.abs(event.deltaY)>.1)step(root,part,event.deltaY>0?1:-1);},{passive:false});
    let touch=null;root.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')return;touch=event.clientY;root.setPointerCapture(event.pointerId);});root.addEventListener('pointerup',event=>{if(touch===null)return;const distance=touch-event.clientY;touch=null;if(Math.abs(distance)>10)step(root,part,distance>0?1:-1);});root.addEventListener('pointercancel',()=>touch=null);
  }
  dialog.querySelector('[aria-label="Закрыть выбор времени"]').addEventListener('click',()=>{dialog.hidePopover();controls.get(active)?.button.focus({preventScroll:true});});
  dialog.addEventListener('toggle',()=>{if(!dialog.matches(':popover-open')){clearInterval(ticker);for(const state of wheelMotion.values())cancelAnimationFrame(state.frame);wheelMotion.clear();}});
  dialog.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{[hour,minute]=b.dataset.time.split(':').map(Number);update(true);}));
  dialog.querySelector('.time-picker-done').addEventListener('click',()=>{clamp();if(minimum(active)>=1440)return;active.value=`${pad(hour)}:${pad(minute)}`;active.dispatchEvent(new Event('input',{bubbles:true}));refresh(active);dialog.hidePopover();controls.get(active)?.button.focus({preventScroll:true});});
  function refresh(input){const control=controls.get(input);if(!control)return;control.value.textContent=input.value||'Выбрать время';control.button.setAttribute('aria-invalid',input.getAttribute('aria-invalid')||'false');}
  function setDate(input,key){input.dataset.date=key;const min=minimum(input),[h,m]=(input.value||'10:00').split(':').map(Number),value=Number.isFinite(h*60+m)?h*60+m:0;const next=min>=1440?'':value<min?`${pad(Math.floor(min/60))}:${pad(min%60)}`:input.value||'10:00';if(input.value!==next){input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));}refresh(input);}
  for(const input of document.querySelectorAll('#scheduled-clock,#calendar-meeting-time')){
    const label=document.querySelector(`label[for="${input.id}"]`),button=document.createElement('button'),value=document.createElement('span');
    button.type='button';button.className='date-field-button time-field-button';button.id=`${input.id}-trigger`;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-describedby',input.getAttribute('aria-describedby')||'');
    if(label){label.id=`${input.id}-label`;label.htmlFor=button.id;value.id=`${input.id}-value`;button.setAttribute('aria-labelledby',`${label.id} ${value.id}`);}
    button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>';button.append(value);input.after(button);input.hidden=true;input.type='hidden';controls.set(input,{button,value});
    button.addEventListener('click',()=>{active=input;setDate(input,input.dataset.date);[hour,minute]=(input.value||'10:00').split(':').map(Number);const parent=button.closest('dialog')||document.body;parent.append(dialog);dialog.showPopover();place();update(true);hours.querySelector('[aria-checked=true]')?.focus({preventScroll:true});clearInterval(ticker);ticker=setInterval(()=>update(true),30000);});
    input.addEventListener('input',()=>refresh(input));new MutationObserver(()=>refresh(input)).observe(input,{attributes:true,attributeFilter:['aria-invalid']});refresh(input);
  }
  window.SozvonTime={refresh,setDate,focus:input=>{const control=controls.get(input);(control?.button||input).focus();}};
})();
