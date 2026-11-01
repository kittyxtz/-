import { useMemo, useRef, useState, useEffect } from 'react';
import { Icon } from './Icons';
import { messageSummary } from '../lib/chatMessages';
import { chatDateLabel, chatDay } from '../lib/chatDates';
import { Popover } from './Primitives';
import Calendar from './Calendar';
import ChatAvatar from './ChatAvatar';

export default function ChatSearch({ chat, members = [], onClose, onResult }) {
  const [query, setQuery] = useState(''), [author, setAuthor] = useState(null), [day, setDay] = useState(''), [filter, setFilter] = useState(null);
  const input = useRef(null), calendarButton = useRef(null), peopleButton = useRef(null);
  useEffect(() => input.current?.focus(), []);
  const searching = Boolean(query.trim());
  const results = useMemo(() => searching ? chat.messages.filter(message => `${messageSummary(message)} ${message.file?.title || ''}`.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU')) && (!author || (author.self ? message.self : !message.self && (message.authorId === author.id || message.author === author.title.split(' ')[0]))) && (!day || message.day === day)).slice().reverse() : [], [chat.messages, query, author, day, searching]);
  function finishFilter() { setFilter(null); input.current?.focus(); }
  return <div className="chat-search-panel" role="region" aria-label="Поиск в переписке" onKeyDown={event => { if (event.key === 'Escape' && !filter) { event.stopPropagation(); onClose(); } }}>
    <div className="chat-search-panel-input"><Icon name="search" /><input ref={input} type="search" aria-label="Текст сообщения" placeholder="Найти сообщение…" value={query} onChange={event => setQuery(event.target.value)} />
      <button ref={calendarButton} className="chat-icon-button" type="button" aria-label="Выбрать дату сообщений" aria-haspopup="dialog" aria-expanded={filter === 'date'} aria-pressed={Boolean(day)} onClick={() => setFilter(filter === 'date' ? null : 'date')}><Icon name="calendar" /></button>
      {chat.kind === 'meeting' && <button ref={peopleButton} className="chat-icon-button" type="button" aria-label="Выбрать участника группы" aria-haspopup="dialog" aria-expanded={filter === 'people'} aria-pressed={Boolean(author)} onClick={() => setFilter(filter === 'people' ? null : 'people')}><Icon name="person" /></button>}
      <button className="chat-icon-button" type="button" aria-label="Закрыть поиск в переписке" onClick={onClose}><Icon name="close" /></button>
    </div>
    {(day || author) && <div className="chat-search-chips">{day && <button type="button" onClick={() => setDay('')} aria-label="Сбросить дату"><Icon name="calendar" />{chatDateLabel(day)}<Icon name="close" /></button>}{author && <button type="button" onClick={() => setAuthor(null)} aria-label="Сбросить участника"><Icon name="person" />{author.self ? 'Вы' : author.title}<Icon name="close" /></button>}</div>}
    {!searching ? <p className="chat-search-prompt">Введите слово или фразу. Дату{chat.kind === 'meeting' ? ' и участника' : ''} можно уточнить значками справа.</p> : <><p className="chat-search-count" role="status">{results.length ? `Найдено: ${results.length}` : 'Сообщения не найдены'}</p><div className="chat-search-results">{results.map(message => <button key={message.id} type="button" onClick={() => onResult(message.id)}><span><strong>{message.self ? 'Вы' : message.author}</strong><small>{chatDateLabel(message.day)} · {message.time}</small></span><span>{messageSummary(message)}</span></button>)}{!results.length && <div className="product-empty"><Icon name="search" /><p>Попробуйте другую фразу или сбросьте фильтры.</p>{(day || author) && <button type="button" onClick={() => { setDay(''); setAuthor(null); }}>Сбросить фильтры</button>}</div>}</div></>}
    {filter === 'date' && <Popover className="date-picker-dialog chat-search-calendar" anchor={calendarButton} label="Дата сообщений" onClose={() => setFilter(null)}><div className="date-picker-heading"><h2>Дата сообщений</h2><button type="button" className="chat-icon-button" aria-label="Закрыть календарь поиска" onClick={finishFilter}><Icon name="close" /></button></div><Calendar compact selected={day || chatDay(new Date())} onSelect={value => { setDay(value); finishFilter(); }} /></Popover>}
    {filter === 'people' && <Popover className="chat-search-people" anchor={peopleButton} label="Участники группы" onClose={() => setFilter(null)}><h3>От кого сообщение</h3><button type="button" onClick={() => { setAuthor(null); finishFilter(); }}><span className="search-person-symbol"><Icon name="users" /></span><span>Все участники</span>{!author && <Icon name="check" />}</button>{members.map(member => <button type="button" key={member.id} onClick={() => { setAuthor(member); finishFilter(); }}><ChatAvatar chat={member} small /><span>{member.self ? 'Вы' : member.title}</span>{author?.id === member.id && <Icon name="check" />}</button>)}</Popover>}
  </div>;
}
