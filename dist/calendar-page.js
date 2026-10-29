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
const countDay=key=>meetings().filter(m=>C.dayKey(new Date(m.date))===key).length;
const calendar=C.mount($('#meetings-calendar'),{selectedDate:selectedDay,getCount:countDay,onSelect:key=>{selectedDay=key;renderAgenda(true);}});
function node(tag,cls,text) { const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e; }
function meetingUrl(code) { const url=new URL('./',location.href);url.searchParams.set('room',code);return url.href; }
function renderAgenda(announce=false) {
  const date=C.parseDay(selectedDay), items=meetings().filter(m=>C.dayKey(new Date(m.date))===selectedDay);
  $('#agenda-title').textContent=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(date);
  const weekday=new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(date);
  $('#agenda-weekday').textContent=`${weekday[0].toUpperCase()+weekday.slice(1)} · ${date.getFullYear()}`;
  $('#agenda-count').textContent=C.plural(items.length);const list=$('#agenda-list');list.replaceChildren();
  if(!items.length){const empty=node('div','agenda-empty');empty.innerHTML='<svg aria-hidden="true" viewBox="0 0 32 32"><path d="M4 11h16a4.5 4.5 0 1 0-4.5-4.5M4 17h21a4.5 4.5 0 1 1-4.5 4.5M4 24h8"/></svg>';empty.append(node('h3','','День открыт для разговора'),node('p','','Добавьте встречу — и здесь появятся ваши планы.'));list.append(empty);}
  for(const meeting of items){
    const item=node('article','agenda-meeting');const time=node('time','agenda-time',new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(meeting.date)));time.dateTime=meeting.date;
    const info=node('div','agenda-meeting-info');info.append(node('h3','',meeting.title));
    const actions=node('div','agenda-meeting-actions');const open=node('a','','Открыть');open.href=meetingUrl(meeting.code);
    const copy=node('button','','Ссылка');copy.type='button';copy.setAttribute('aria-label',`Скопировать ссылку: ${meeting.title}`);copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(meetingUrl(meeting.code));copy.textContent='Скопировано';$('#calendar-live').textContent='Ссылка скопирована';}catch{const link=node('input','agenda-copy-fallback');link.readOnly=true;link.value=meetingUrl(meeting.code);link.setAttribute('aria-label','Ссылка на встречу');info.append(link);link.focus();link.select();$('#calendar-live').textContent='Скопируйте выделенную ссылку через меню браузера.';}});
    const download=node('button','','В календарь');download.type='button';download.setAttribute('aria-label',`Скачать приглашение: ${meeting.title}`);download.addEventListener('click',()=>downloadIcs(meeting));
    actions.append(open,copy,download);info.append(actions);item.append(time,info);list.append(item);
  }
  if(announce)$('#calendar-live').textContent=`${$('#agenda-title').textContent}: ${C.plural(items.length)}`;
  if(standalone){const url=new URL(location.href);url.searchParams.set('day',selectedDay);history.replaceState(null,'',url);}
}
function openAdd() {
  const next=new Date(Date.now()+3600000);next.setMinutes(Math.ceil(next.getMinutes()/15)*15,0,0);
  if(selectedDay===C.dayKey(new Date())&&C.dayKey(next)!==selectedDay){selectedDay=C.dayKey(next);calendar.setSelected(selectedDay);renderAgenda();}
  $('#calendar-add-day').textContent=C.formatDay(selectedDay);$('#calendar-meeting-name').value='';$('#calendar-add-error').hidden=true;
  $('#calendar-meeting-name').removeAttribute('aria-invalid');$('#calendar-meeting-time').removeAttribute('aria-invalid');
  $('#calendar-meeting-time').value=selectedDay===C.dayKey(next)?`${String(next.getHours()).padStart(2,'0')}:${String(next.getMinutes()).padStart(2,'0')}`:'10:00';
  window.SozvonTime?.refresh($('#calendar-meeting-time'));
  $('#calendar-add-dialog').showModal();$('#calendar-meeting-name').focus();
}
$('#agenda-add').addEventListener('click',openAdd);$('#close-calendar-add').addEventListener('click',()=>$('#calendar-add-dialog').close());
$('#calendar-add-form').addEventListener('submit',event=>{
  event.preventDefault();const title=$('#calendar-meeting-name').value.trim(),date=new Date(`${selectedDay}T${$('#calendar-meeting-time').value}`);
  const invalid=!title?$('#calendar-meeting-name'):!Number.isFinite(date.getTime())||date.getTime()<=Date.now()?$('#calendar-meeting-time'):null;
  if(invalid){$('#calendar-add-error').textContent=!title?'Введите название встречи.':'Выберите будущий день и время. Для другой даты закройте это окно и выберите день в календаре.';$('#calendar-add-error').hidden=false;invalid.setAttribute('aria-invalid','true');window.SozvonTime?.focus(invalid);return;}
  const words=['air','sky','wave','kite','wind','blue','flow','cloud'],random=crypto.getRandomValues(new Uint16Array(3));
  const meeting={title,date:date.toISOString(),code:`${words[random[0]%words.length]}-${words[random[1]%words.length]}-${100+random[2]%900}`};
  try{localStorage.setItem('sozvon-meetings',JSON.stringify([...meetings(),meeting]));}catch{$('#calendar-add-error').textContent='Разрешите сохранение данных в браузере и попробуйте ещё раз.';$('#calendar-add-error').hidden=false;return;}
  $('#calendar-add-dialog').close();calendar.refresh();renderAgenda();$('#calendar-live').textContent='Встреча добавлена';
});
function downloadIcs(meeting) {
  const escape=value=>value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sozvon//Meetings//RU','BEGIN:VEVENT',`UID:${meeting.code}@sozvon`,`DTSTAMP:${stamp(Date.now())}`,`DTSTART:${stamp(meeting.date)}`,`DTEND:${stamp(Date.parse(meeting.date)+3600000)}`,`SUMMARY:${escape(meeting.title)}`,`URL:${meetingUrl(meeting.code)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));const a=node('a');a.href=url;a.download=`sozvon-${meeting.code}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
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
  function open(day){if(C.parseDay(day)){selectedDay=day;calendar.setSelected(day);}calendar.refresh();renderAgenda();if(modal.open)return;closing=false;modal.showModal();document.body.classList.add('calendar-open');$('#calendar-modal-title').focus({preventScroll:true});if(!reduced())modal.animate([{opacity:0,transform:'translateY(-28px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:340,easing:'cubic-bezier(.2,.8,.2,1)'});}
  async function close(){if(closing)return;closing=true;if(!reduced()){try{await modal.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-16px)'}],{duration:180,easing:'ease-in'}).finished;}catch{}}modal.close();document.body.classList.remove('calendar-open');closing=false;}
  $('#my-meetings').addEventListener('click',event=>{event.preventDefault();open();});
  $('#close-meetings-modal').addEventListener('click',close);
  modal.addEventListener('cancel',event=>{event.preventDefault();close();});
  modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
  window.SozvonMeetings={open,close};if(requested)open(selectedDay);
}
})();
