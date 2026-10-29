'use strict';
(() => {
  const dialog=document.createElement('dialog');dialog.className='time-picker-dialog';dialog.setAttribute('aria-labelledby','time-picker-title');
  dialog.innerHTML='<div class="date-picker-heading"><h2 id="time-picker-title">Время встречи</h2><button type="button" class="icon-button" aria-label="Закрыть выбор времени"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 8 8 8m-8 0 8-8"/></svg></button></div><p class="time-picker-preview" aria-hidden="true">10:00</p><div class="time-wheels"><div><p id="time-hours-label">Часы</p><div class="time-wheel" id="time-hours" role="radiogroup" aria-labelledby="time-hours-label"></div></div><span class="time-colon" aria-hidden="true">:</span><div><p id="time-minutes-label">Минуты</p><div class="time-wheel" id="time-minutes" role="radiogroup" aria-labelledby="time-minutes-label"></div></div></div><div class="time-presets" aria-label="Удобное время"><button type="button" data-time="10:00">10:00</button><button type="button" data-time="14:00">14:00</button><button type="button" data-time="19:00">19:00</button></div><button type="button" class="primary-button time-picker-done">Выбрать время</button>';
  document.body.append(dialog);
  const controls=new Map(),pad=n=>String(n).padStart(2,'0');let active=null,hour=10,minute=0;
  const hours=dialog.querySelector('#time-hours'),minutes=dialog.querySelector('#time-minutes');
  function update(scroll=false){
    dialog.querySelector('.time-picker-preview').textContent=`${pad(hour)}:${pad(minute)}`;
    for(const [root,value] of [[hours,hour],[minutes,minute]]){
      for(const button of root.children){const selected=Number(button.dataset.value)===value;button.setAttribute('aria-checked',String(selected));button.tabIndex=selected?0:-1;}
      if(scroll){const selected=root.children[value];root.scrollTo({top:selected.offsetTop-root.clientHeight/2+selected.clientHeight/2,behavior:'instant'});}
    }
  }
  for(const [root,max,part] of [[hours,24,'hour'],[minutes,60,'minute']]){
    for(let i=0;i<max;i++){const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=pad(i);b.dataset.value=i;b.setAttribute('aria-label',`${part==='hour'?'Часы':'Минуты'}: ${pad(i)}`);b.addEventListener('click',()=>{if(part==='hour')hour=i;else minute=i;update(true);});b.addEventListener('keydown',event=>{let next=i;if(event.key==='ArrowDown')next=(i+1)%max;else if(event.key==='ArrowUp')next=(i-1+max)%max;else if(event.key==='Home')next=0;else if(event.key==='End')next=max-1;else return;event.preventDefault();if(part==='hour')hour=next;else minute=next;update(true);root.children[next].focus({preventScroll:true});});root.append(b);}
    let settled;root.addEventListener('scroll',()=>{clearTimeout(settled);settled=setTimeout(()=>{const center=root.getBoundingClientRect().top+root.clientHeight/2;let closest=0,distance=Infinity;for(const b of root.children){const r=b.getBoundingClientRect(),d=Math.abs(r.top+r.height/2-center);if(d<distance){distance=d;closest=Number(b.dataset.value);}}if(part==='hour')hour=closest;else minute=closest;update();},100);},{passive:true});
  }
  dialog.querySelector('[aria-label="Закрыть выбор времени"]').addEventListener('click',()=>dialog.close());
  dialog.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{[hour,minute]=b.dataset.time.split(':').map(Number);update(true);}));
  dialog.querySelector('.time-picker-done').addEventListener('click',()=>{active.value=`${pad(hour)}:${pad(minute)}`;active.dispatchEvent(new Event('input',{bubbles:true}));refresh(active);dialog.close();});
  function refresh(input){const control=controls.get(input);if(!control)return;control.value.textContent=input.value||'Выбрать время';control.button.setAttribute('aria-invalid',input.getAttribute('aria-invalid')||'false');}
  for(const input of document.querySelectorAll('#scheduled-clock,#calendar-meeting-time')){
    const label=document.querySelector(`label[for="${input.id}"]`),button=document.createElement('button'),value=document.createElement('span');
    button.type='button';button.className='date-field-button time-field-button';button.id=`${input.id}-trigger`;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-describedby',input.getAttribute('aria-describedby')||'');
    if(label){label.id=`${input.id}-label`;label.htmlFor=button.id;value.id=`${input.id}-value`;button.setAttribute('aria-labelledby',`${label.id} ${value.id}`);}
    button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>';button.append(value);input.after(button);input.hidden=true;input.type='hidden';controls.set(input,{button,value});
    button.addEventListener('click',()=>{active=input;[hour,minute]=(input.value||'10:00').split(':').map(Number);if(!Number.isInteger(hour)||!Number.isInteger(minute)){hour=10;minute=0;}dialog.showModal();update(true);hours.children[hour].focus({preventScroll:true});});
    input.addEventListener('input',()=>refresh(input));new MutationObserver(()=>refresh(input)).observe(input,{attributes:true,attributeFilter:['aria-invalid']});refresh(input);
  }
  window.SozvonTime={refresh,focus:input=>{const control=controls.get(input);(control?.button||input).focus();}};
})();
