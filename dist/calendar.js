'use strict';
(() => {
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function parseDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y,m,d] = value.split('-').map(Number), date = new Date(y,m-1,d,12);
    return dayKey(date) === value ? date : null;
  }
  function addMonths(date, offset) {
    const target = new Date(date.getFullYear(),date.getMonth()+offset,1,12);
    target.setDate(Math.min(date.getDate(),new Date(target.getFullYear(),target.getMonth()+1,0).getDate()));
    return target;
  }
  const plural = n => `${n} ${new Intl.PluralRules('ru-RU').select(n)==='one'?'встреча':new Intl.PluralRules('ru-RU').select(n)==='few'?'встречи':'встреч'}`;
  const formatDay = value => new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(parseDay(value));
  function element(tag, cls, text) { const node=document.createElement(tag); if(cls)node.className=cls; if(text!==undefined)node.textContent=text; return node; }
  class Calendar {
    constructor(root, options={}) {
      this.root=root; this.options=options; this.selected=parseDay(options.selectedDate)?options.selectedDate:dayKey(new Date());
      this.focused=this.selected; this.month=parseDay(this.selected); this.month.setDate(1);
      root.classList.add('month-calendar'); if(options.compact)root.classList.add('is-compact');
      this.header=element('div','month-toolbar');
      this.title=element('h2','month-title'); this.title.setAttribute('aria-live','polite');
      this.nav=element('div','month-nav');
      this.previous=this.navButton('Предыдущий месяц','previous',()=>this.moveMonth(-1));
      this.next=this.navButton('Следующий месяц','next',()=>this.moveMonth(1));
      this.today=element('button','month-today','Сегодня'); this.today.type='button'; this.today.addEventListener('click',()=>this.select(dayKey(new Date()),true));
      this.nav.append(this.today,this.previous,this.next); this.header.append(this.title,this.nav);
      this.grid=element('div','month-grid'); this.grid.setAttribute('role','grid'); this.grid.setAttribute('aria-colcount','7');
      this.stage=element('div','month-stage');this.stage.append(this.grid);
      root.replaceChildren(this.header,this.stage); this.render();
    }
    navButton(label,cls,handler) {
      const b=element('button',`month-arrow ${cls}`); b.type='button'; b.setAttribute('aria-label',label);
      b.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>'; b.addEventListener('click',handler); return b;
    }
    allowed(key) { return !this.options.minDate || key>=this.options.minDate; }
    moveMonth(offset,selectedKey=null) {
      this.monthAnimation?.cancel();this.oldAnimation?.cancel();this.ghost?.remove();
      const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ghost=motion?this.grid.cloneNode(true):null;
      if(ghost){ghost.classList.add('month-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;this.stage.append(ghost);this.ghost=ghost;}
      this.month=addMonths(this.month,offset);this.month.setDate(1);this.focused=selectedKey||dayKey(this.month);if(selectedKey)this.selected=selectedKey;this.render();
      if(ghost){
        const options={duration:400,easing:'cubic-bezier(.22,.75,.2,1)'};
        const direction=offset>0?1:-1;
        this.monthAnimation=this.grid.animate([{transform:`translateX(${direction*105}%)`},{transform:'translateX(0)'}],options);
        const animation=ghost.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*105}%)`}],options);this.oldAnimation=animation;
        animation.finished.then(()=>{ghost.remove();if(this.ghost===ghost)this.ghost=null;}).catch(()=>ghost.remove());
      }
    }
    setSelected(key,{navigate=true}={}) {
      if(!parseDay(key)||!this.allowed(key))return;
      this.selected=key; this.focused=key;
      if(navigate){this.month=parseDay(key);this.month.setDate(1);} this.render();
    }
    select(key,focus=false) {
      const target=parseDay(key);if(!target||!this.allowed(key))return;
      const offset=(target.getFullYear()-this.month.getFullYear())*12+target.getMonth()-this.month.getMonth();
      if(offset)this.moveMonth(offset,key);else this.setSelected(key,{navigate:false});
      if(focus)this.focusDay(key);this.options.onSelect?.(key);
    }
    refresh() { this.render(); }
    focusDay(key) { this.grid.querySelector(`[data-day="${key}"]`)?.focus({preventScroll:true}); }
    render() {
      const active=this.root.contains(document.activeElement)?document.activeElement.getAttribute('data-day'):null;
      const label=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(this.month).replace(' г.','');
      this.title.textContent=label[0].toUpperCase()+label.slice(1); this.grid.setAttribute('aria-label',this.title.textContent);
      const minimum=parseDay(this.options.minDate); this.previous.disabled=!!minimum&&this.month.getFullYear()*12+this.month.getMonth()<=minimum.getFullYear()*12+minimum.getMonth();
      this.today.disabled=!this.allowed(dayKey(new Date())); this.grid.replaceChildren();
      const headings=element('div','month-weekdays'); headings.setAttribute('role','row');
      ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(label=>{const span=element('span','',label);span.setAttribute('role','columnheader');headings.append(span);}); this.grid.append(headings);
      const start=new Date(this.month); start.setDate(1-(start.getDay()+6)%7);
      const today=dayKey(new Date());
      const monthFocus=parseDay(this.focused); if(!monthFocus||monthFocus.getMonth()!==this.month.getMonth()||monthFocus.getFullYear()!==this.month.getFullYear())this.focused=dayKey(this.month);
      if(!this.allowed(this.focused))this.focused=this.options.minDate;
      for(let week=0;week<6;week++){
        const row=element('div','month-week');row.setAttribute('role','row');
        for(let i=0;i<7;i++){
          const date=new Date(start);date.setDate(start.getDate()+week*7+i);const key=dayKey(date), count=this.options.getCount?.(key)||0;
          const cell=element('div','month-cell');cell.setAttribute('role','gridcell');cell.setAttribute('aria-selected',String(key===this.selected));
          const button=element('button','month-day');button.type='button';button.dataset.day=key;button.tabIndex=key===this.focused?0:-1;button.disabled=!this.allowed(key);
          if(date.getMonth()!==this.month.getMonth())button.classList.add('outside-month');if(key===today){button.classList.add('is-today');button.setAttribute('aria-current','date');}if(key===this.selected)button.classList.add('is-selected');
          if(key<today)button.classList.add('is-past-day');
          const full=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',weekday:'long'}).format(date);
          button.setAttribute('aria-label',`${full}${key===this.selected?', выбрано':''}${count?`, ${plural(count)}`:''}`);
          button.append(element('span','month-day-number',date.getDate()));
          if(count){const badge=element('span','month-day-events',plural(count));badge.setAttribute('aria-hidden','true');button.append(badge);}
          button.addEventListener('click',()=>this.select(key,true));button.addEventListener('keydown',e=>this.keydown(e,date));cell.append(button);row.append(cell);
        } this.grid.append(row);
      }
      if(active)this.focusDay(active);
    }
    keydown(event,date) {
      const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'];if(!keys.includes(event.key))return;event.preventDefault();
      let next=new Date(date);const weekday=(date.getDay()+6)%7;
      if(event.key==='PageUp'||event.key==='PageDown')next=addMonths(date,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1));
      else next.setDate(date.getDate()+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-weekday,End:6-weekday}[event.key]));
      let key=dayKey(next);if(!this.allowed(key)){key=this.options.minDate;next=parseDay(key);}this.focused=key;this.month=new Date(next.getFullYear(),next.getMonth(),1,12);this.render();this.focusDay(key);
    }
  }
  function conflict(items,date){const stamp=Math.floor(new Date(date).getTime()/60000);return items.find(m=>Math.floor(Date.parse(m.date)/60000)===stamp);}
  window.SozvonCalendar={mount:(root,options)=>new Calendar(root,options),dayKey,parseDay,formatDay,plural,conflict};
})();
