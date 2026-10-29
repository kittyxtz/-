'use strict';
(() => {
const standalone=!!document.querySelector('#meetings-calendar');
if(!standalone){const fragment=document.createElement('template');fragment.innerHTML="<dialog id=\"meetings-modal\" class=\"meetings-modal\" aria-labelledby=\"calendar-modal-title\"><button class=\"icon-button dialog-close\" id=\"close-meetings-modal\" aria-label=\"Закрыть мои встречи\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"m8 8 8 8m-8 0 8-8\"/></svg></button><div class=\"calendar-modal-content\"><div class=\"calendar-page-heading\"><div><span class=\"section-kicker\">ВАШ РИТМ ОБЩЕНИЯ</span><h2 id=\"calendar-modal-title\" tabindex=\"-1\">Мои встречи</h2><p>Все планы на разговор — в одном месте.</p></div></div><div class=\"calendar-layout\"><section class=\"day-agenda\" id=\"day-agenda\" aria-labelledby=\"agenda-title\"><div class=\"agenda-heading\"><span class=\"section-kicker\">ВЫБРАННЫЙ ДЕНЬ</span><span class=\"agenda-count\" id=\"agenda-count\">0 встреч</span></div><h2 id=\"agenda-title\"></h2><p class=\"agenda-weekday\" id=\"agenda-weekday\"></p><div class=\"agenda-scroll\" id=\"agenda-list\" role=\"region\" aria-label=\"Встречи выбранного дня\" tabindex=\"0\"></div><button class=\"primary-button agenda-add\" id=\"agenda-add\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></svg>Добавить встречу</button><p class=\"calendar-live\" id=\"calendar-live\" role=\"status\"></p></section><section class=\"calendar-board\" id=\"calendar-board\" aria-label=\"Календарь встреч\"><div id=\"meetings-calendar\"></div><div class=\"calendar-legend\"><span><i></i>Сегодня</span><span><i></i>Есть встречи</span></div></section></div></div></dialog><dialog id=\"calendar-add-dialog\" class=\"calendar-add-dialog\" aria-labelledby=\"calendar-add-title\"><button class=\"icon-button dialog-close\" id=\"close-calendar-add\" aria-label=\"Закрыть добавление встречи\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"m8 8 8 8m-8 0 8-8\"/></svg></button><span class=\"dialog-emblem\"><svg aria-hidden=\"true\"><use href=\"#i-calendar\"/></svg></span><h2 id=\"calendar-add-title\">Новая встреча</h2><p id=\"calendar-add-day\"></p><form id=\"calendar-add-form\" novalidate><div class=\"field\"><label for=\"calendar-meeting-name\">Название</label><input id=\"calendar-meeting-name\" name=\"title\" maxlength=\"90\" placeholder=\"Например, встреча команды\" aria-describedby=\"calendar-add-error\"></div><div class=\"field\"><label for=\"calendar-meeting-time\">Время начала</label><input id=\"calendar-meeting-time\" name=\"time\" type=\"time\" required aria-describedby=\"calendar-add-error\"></div><p class=\"field-error\" id=\"calendar-add-error\" role=\"alert\" hidden></p><button type=\"submit\" class=\"primary-button\">Добавить встречу</button></form></dialog>";document.body.append(fragment.content);}

const $ = selector => document.querySelector(selector);
const C = window.SozvonCalendar;
function read(key,fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function meetings() { const data=read('sozvon-meetings',[]);return (Array.isArray(data)?data:[]).filter(m=>m&&typeof m.title==='string'&&/^[a-z0-9]{2,12}-[a-z0-9]{2,12}-\d{3}$/i.test(m.code)&&Number.isFinite(Date.parse(m.date))).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)); }
const requested=new URL(location.href).searchParams.get(standalone?'day':'calendar');
let selectedDay=C.parseDay(requested)?requested:C.dayKey(new Date());
let modalSession=0;
const countDay=key=>meetings().filter(m=>C.dayKey(new Date(m.date))===key).length;
const calendar=C.mount($('#meetings-calendar'),{selectedDate:selectedDay,getCount:countDay,onSelect:key=>{selectedDay=key;clearSaved();renderAgenda(true);}});
function node(tag,cls,text) { const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e; }
function meetingUrl(code) { const url=new URL('./',location.href);url.searchParams.set('room',code);return url.href; }
function renderAgenda(announce=false) {
  const date=C.parseDay(selectedDay), todayItems=meetings().filter(m=>C.dayKey(new Date(m.date))===selectedDay),now=Date.now();
  const items=[...todayItems.filter(m=>Date.parse(m.date)>=now),...todayItems.filter(m=>Date.parse(m.date)<now)];let pastLabel=false;
  $('#agenda-title').textContent=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(date);
  const weekday=new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(date);
  $('#agenda-weekday').textContent=`${weekday[0].toUpperCase()+weekday.slice(1)} · ${date.getFullYear()}`;
  $('#agenda-count').textContent=C.plural(items.length);const list=$('#agenda-list');list.replaceChildren();
  $('#agenda-add').disabled=selectedDay<C.dayKey(new Date());
  if(!items.length){const empty=node('div','agenda-empty');empty.innerHTML='<svg aria-hidden="true" viewBox="0 0 32 32"><path d="M4 11h16a4.5 4.5 0 1 0-4.5-4.5M4 17h21a4.5 4.5 0 1 1-4.5 4.5M4 24h8"/></svg>';empty.append(node('h3','','День открыт для разговора'),node('p','','Добавьте встречу — и здесь появятся ваши планы.'));list.append(empty);}
  for(const meeting of items){
    const past=Date.parse(meeting.date)<now;if(past&&!pastLabel){const divider=node('div','agenda-past-divider','Уже прошли');list.append(divider);pastLabel=true;}
    const item=node('article',`agenda-meeting${past?' is-past':''}`);item.dataset.code=meeting.code;const time=node('time','agenda-time',new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(meeting.date)));time.dateTime=meeting.date;
    const info=node('div','agenda-meeting-info');info.append(node('h3','',meeting.title));
    const actions=node('div','agenda-meeting-actions');const open=node('a','agenda-open');open.href=meetingUrl(meeting.code);open.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 5-3v10l-5-3"/></svg><span>Открыть</span>';
    const linkIcon='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 15V3m-4 4 4-4 4 4M8 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/></svg>';
    const copy=node('button','agenda-copy');copy.innerHTML=linkIcon;copy.type='button';copy.setAttribute('aria-label',`Скопировать ссылку: ${meeting.title}`);copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(meetingUrl(meeting.code));copy.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"/></svg>';copy.setAttribute('aria-label',`Ссылка скопирована: ${meeting.title}`);$('#calendar-live').textContent='Ссылка скопирована';setTimeout(()=>{copy.innerHTML=linkIcon;copy.setAttribute('aria-label',`Скопировать ссылку: ${meeting.title}`);},2000);}catch{const link=node('input','agenda-copy-fallback');link.readOnly=true;link.value=meetingUrl(meeting.code);link.setAttribute('aria-label','Ссылка на встречу');info.append(link);link.focus();link.select();$('#calendar-live').textContent='Скопируйте выделенную ссылку через меню браузера.';}});
    const cancel=node('button','agenda-cancel','Отменить');cancel.type='button';cancel.setAttribute('aria-label',`Отменить встречу: ${meeting.title}`);cancel.addEventListener('click',()=>cancelMeeting(meeting,item,cancel));
    cancel.className='agenda-delete';cancel.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16m-11 0V3h6v3M6 6l1 14h10l1-14M10 10v6m4-6v6"/></svg>';
    actions.append(open,copy);item.append(time,info,actions,cancel);list.append(item);
  }
  if(announce&&!matchMedia('(prefers-reduced-motion: reduce)').matches)list.animate([{opacity:0,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0)'}],{duration:300,easing:'cubic-bezier(.22,.75,.2,1)'});
  if(announce)$('#calendar-live').textContent=`${$('#agenda-title').textContent}: ${C.plural(items.length)}`;
  if(standalone){const url=new URL(location.href);url.searchParams.set('day',selectedDay);history.replaceState(null,'',url);}
}
function openAdd() {
  if(selectedDay<C.dayKey(new Date()))return;
  const next=new Date(Date.now()+3600000);next.setMinutes(Math.ceil(next.getMinutes()/15)*15,0,0);
  if(selectedDay===C.dayKey(new Date())&&C.dayKey(next)!==selectedDay){selectedDay=C.dayKey(next);calendar.setSelected(selectedDay);renderAgenda();}
  $('#calendar-add-day').textContent=C.formatDay(selectedDay);$('#calendar-meeting-name').value='';$('#calendar-add-error').hidden=true;
  $('#calendar-meeting-name').removeAttribute('aria-invalid');$('#calendar-meeting-time').removeAttribute('aria-invalid');
  $('#calendar-meeting-time').value=selectedDay===C.dayKey(next)?`${String(next.getHours()).padStart(2,'0')}:${String(next.getMinutes()).padStart(2,'0')}`:'10:00';
  window.SozvonTime?.setDate($('#calendar-meeting-time'),selectedDay);
  $('#calendar-add-dialog').showModal();$('#calendar-meeting-name').focus();
}
$('#agenda-add').addEventListener('click',openAdd);$('#close-calendar-add').addEventListener('click',()=>$('#calendar-add-dialog').close());
$('#calendar-add-form').addEventListener('submit',event=>{
  event.preventDefault();const title=$('#calendar-meeting-name').value.trim(),date=new Date(`${selectedDay}T${$('#calendar-meeting-time').value}`);
  const invalid=!title?$('#calendar-meeting-name'):!Number.isFinite(date.getTime())||date.getTime()<=Date.now()?$('#calendar-meeting-time'):null;
  if(invalid){$('#calendar-add-error').textContent=!title?'Введите название встречи.':'Выберите будущий день и время. Для другой даты закройте это окно и выберите день в календаре.';$('#calendar-add-error').hidden=false;invalid.setAttribute('aria-invalid','true');window.SozvonTime?.focus(invalid);return;}
  if(C.conflict(meetings(),date)){$('#calendar-add-error').textContent='На это время уже запланирована встреча. Выберите другое время.';$('#calendar-add-error').hidden=false;$('#calendar-meeting-time').setAttribute('aria-invalid','true');window.SozvonTime.focus($('#calendar-meeting-time'));return;}
  const words=['air','sky','wave','kite','wind','blue','flow','cloud'],random=crypto.getRandomValues(new Uint16Array(3));
  const meeting={title,date:date.toISOString(),code:`${words[random[0]%words.length]}-${words[random[1]%words.length]}-${100+random[2]%900}`};
  try{localStorage.setItem('sozvon-meetings',JSON.stringify([...meetings(),meeting]));}catch{$('#calendar-add-error').textContent='Разрешите сохранение данных в браузере и попробуйте ещё раз.';$('#calendar-add-error').hidden=false;return;}
  $('#calendar-add-dialog').close();calendar.refresh();renderAgenda();showSaved(meeting.code);
});
function clearSaved(){document.querySelector('.calendar-success')?.remove();const subtitle=$('.calendar-page-heading p');if(subtitle){subtitle.classList.remove('is-saved');subtitle.textContent='Все планы на разговор — в одном месте.';subtitle.removeAttribute('role');}}
function showSaved(code){
  const meeting=meetings().find(m=>m.code===code);if(!meeting)return;
  dismissCancellationNotice();
  const subtitle=$('.calendar-page-heading p');subtitle.classList.add('is-saved');subtitle.setAttribute('role','status');subtitle.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path class="saved-check" d="m8 12 3 3 5-6"/></svg>';
  subtitle.append(node('span','',`Запланировано на ${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(meeting.date))}`));
  $('#calendar-live').textContent=`Встреча «${meeting.title}» запланирована`;
  document.querySelector('.calendar-success')?.remove();
  const celebration=node('div','calendar-success');celebration.setAttribute('aria-hidden','true');
  celebration.innerHTML='<div class="calendar-success-symbol"><svg viewBox="0 0 96 96"><circle class="success-track" cx="48" cy="48" r="36"/><circle class="success-ring" cx="48" cy="48" r="36"/><path class="success-check" d="m33 48 10 10 21-23"/></svg></div>';
  celebration.append(node('strong','','Встреча запланирована'),node('span','',`${new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(meeting.date))} · ${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(meeting.date))}`));
  celebration.addEventListener('click',()=>celebration.remove());$('#calendar-board').append(celebration);setTimeout(()=>celebration.remove(),1900);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){subtitle.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,easing:'cubic-bezier(.2,.8,.2,1)'});const item=[...document.querySelectorAll('.agenda-meeting')].find(e=>e.dataset.code===code);item?.animate([{opacity:.3,transform:'translateY(10px)',backgroundColor:'rgba(80,135,230,.24)'},{opacity:1,transform:'translateY(0)',backgroundColor:'rgba(80,135,230,.15)',offset:.35},{opacity:1,transform:'translateY(0)',backgroundColor:'transparent'}],{duration:1500,easing:'cubic-bezier(.2,.8,.2,1)'});$('#meetings-calendar .month-day.is-selected')?.animate([{boxShadow:'inset 0 0 0 2px rgba(49,91,216,.6)'},{boxShadow:'inset 0 0 0 2px transparent'}],{duration:1500});}
}
const undoBar=node('div','calendar-undo');undoBar.hidden=true;undoBar.setAttribute('role','status');const undoText=node('span'),undoButton=node('button','','Вернуть');undoButton.type='button';undoBar.append(undoText,undoButton);
const noticeSlot=node('div','calendar-notice-slot');noticeSlot.append(undoBar);($('.calendar-modal-content')||$('#calendar-main')).append(noticeSlot);
const dismissUndo=node('button','undo-dismiss');dismissUndo.type='button';dismissUndo.setAttribute('aria-label','Скрыть уведомление');dismissUndo.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 8 8 8m-8 0 8-8"/></svg>';dismissUndo.addEventListener('click',()=>{dismissCancellationNotice();$('#agenda-add').focus({preventScroll:true});});undoBar.append(dismissUndo);
let cancellationTimer=null,noticeVersion=0,noticeExit=null;
let cancelled=read('sozvon-last-cancelled',null);if(cancelled&&typeof cancelled.title==='string'&&Number.isFinite(Date.parse(cancelled.date)))cancellationNotice('Встреча отменена',true);else cancelled=null;
function cancellationNotice(text,canUndo=false){
  if(!standalone&&!$('#meetings-modal').open)return;
  dismissCancellationNotice();undoText.textContent=text;undoButton.hidden=!canUndo;undoBar.hidden=false;scheduleNoticeHide();
}
function dismissCancellationNotice(){clearTimeout(cancellationTimer);++noticeVersion;noticeExit?.cancel();noticeExit=null;undoBar.hidden=true;}
function scheduleNoticeHide(delay=2800){
  clearTimeout(cancellationTimer);const version=noticeVersion;
  cancellationTimer=setTimeout(()=>{
    const hide=()=>{if(version!==noticeVersion)return;if(undoBar.contains(document.activeElement))$('#agenda-add').focus({preventScroll:true});undoBar.hidden=true;};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){hide();return;}
    noticeExit=undoBar.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(4px)'}],{duration:120,easing:'ease-in'});noticeExit.finished.then(hide).catch(()=>{});
  },delay);
}
undoBar.addEventListener('pointerenter',()=>clearTimeout(cancellationTimer));undoBar.addEventListener('pointerleave',()=>scheduleNoticeHide(900));
async function cancelMeeting(meeting,item,button){
  button.disabled=true;const session=modalSession;
  try{localStorage.setItem('sozvon-last-cancelled',JSON.stringify(meeting));localStorage.setItem('sozvon-meetings',JSON.stringify(meetings().filter(m=>m.code!==meeting.code)));}catch{button.disabled=false;cancellationNotice('Не удалось отменить встречу. Попробуйте ещё раз.');return;}
  cancelled=meeting;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){try{await item.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(12px)'}],{duration:220,easing:'ease-out'}).finished;}catch{}}
  clearSaved();calendar.refresh();renderAgenda(true);if(session===modalSession){cancellationNotice('Встреча отменена',true);if(!undoBar.hidden)undoButton.focus({preventScroll:true});}
}
undoButton.addEventListener('click',()=>{
  if(!cancelled)return;
  if(C.conflict(meetings(),cancelled.date)){cancellationNotice('Это время уже занято другой встречей.',true);return;}
  try{localStorage.setItem('sozvon-meetings',JSON.stringify([...meetings(),cancelled]));localStorage.removeItem('sozvon-last-cancelled');}catch{cancellationNotice('Не удалось восстановить встречу.',true);return;}
  selectedDay=C.dayKey(new Date(cancelled.date));calendar.setSelected(selectedDay);renderAgenda(true);cancelled=null;cancellationNotice('Встреча восстановлена');$('#agenda-add').focus({preventScroll:true});
});
if(standalone){
const identity=read('sozvon-name','');$('#header-avatar').textContent=(typeof identity==='string'&&identity?identity:'Я').slice(0,1).toUpperCase();
const tone=read('sozvon-avatar','blue');if(['blue','mint','lavender'].includes(tone))$('#header-avatar').dataset.tone=tone;
function themeLabel(){$('#theme-toggle').setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?'Включить светлую тему':'Включить тёмную тему');}themeLabel();
$('#theme-toggle').addEventListener('click',()=>{const root=document.documentElement;root.classList.add('theme-changing');const dark=root.dataset.theme!=='dark';root.dataset.theme=dark?'dark':'light';try{localStorage.setItem('sozvon-theme',dark?'dark':'light');}catch{}themeLabel();void root.offsetHeight;requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('theme-changing')));});
}
const narrow=matchMedia('(max-width:850px)');const layout=$('.calendar-layout'),board=$('#calendar-board'),agenda=$('#day-agenda');
function arrange(){const active=document.activeElement,restore=layout.contains(active);if(narrow.matches)layout.append(board,agenda);else layout.append(agenda,board);if(restore)active.focus({preventScroll:true});}narrow.addEventListener('change',arrange);arrange();renderAgenda();
window.addEventListener('storage',event=>{if(event.key==='sozvon-meetings'){calendar.refresh();renderAgenda();}});

if(!standalone){
  const modal=$('#meetings-modal');let closing=false;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function open(day,{created=null}={}){clearSaved();if(C.parseDay(day)){selectedDay=day;calendar.setSelected(day);}calendar.refresh();renderAgenda();if(created)showSaved(created);if(modal.open)return;closing=false;++modalSession;dismissCancellationNotice();modal.showModal();document.body.classList.add('calendar-open');$('#calendar-modal-title').focus({preventScroll:true});if(!reduced())modal.animate([{opacity:0,transform:'translateY(-28px)'},{opacity:1,transform:'translateY(0)'}],{duration:440,easing:'cubic-bezier(.16,.8,.2,1)'});}
  async function close(){if(closing)return;closing=true;++modalSession;dismissCancellationNotice();if(!reduced()){try{await modal.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-16px)'}],{duration:180,easing:'ease-in'}).finished;}catch{}}modal.close();document.body.classList.remove('calendar-open');closing=false;}
  [...document.querySelectorAll('#my-meetings,[data-open-meetings]')].forEach(link=>link.addEventListener('click',event=>{event.preventDefault();open();}));
  $('#close-meetings-modal').addEventListener('click',close);
  modal.addEventListener('cancel',event=>{event.preventDefault();close();});
  modal.addEventListener('close',dismissCancellationNotice);
  modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
  window.SozvonMeetings={open,close};if(requested)open(selectedDay);
}
})();
