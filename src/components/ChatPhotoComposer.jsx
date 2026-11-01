import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CloseButton, Modal } from './Primitives';
import { Icon } from './Icons';

export default function ChatPhotoComposer({ files, onClose, onSend, onAdd }) {
  const [previews, setPreviews] = useState([]), [caption, setCaption] = useState(''), [asFile, setAsFile] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const sending = useRef(false), picker = useRef(null), previewCache = useRef(new Map());
  useEffect(() => () => { previewCache.current.forEach(item => URL.revokeObjectURL(item.url)); previewCache.current.clear(); }, []);
  useLayoutEffect(() => {
    let active = true;
    const items = files.map(file => {
      if (!previewCache.current.has(file)) previewCache.current.set(file, { file, url: URL.createObjectURL(file), image: file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(file.name) });
      return previewCache.current.get(file);
    });
    Promise.all(items.map(async item => {
      if (item.image) {
        const image = new Image(); image.src = item.url;
        try { await image.decode(); item.ratio = image.naturalWidth / image.naturalHeight; } catch { item.image = false; }
      }
      return item;
    })).then(ready => { if (active) setPreviews(ready); });
    return () => { active = false; };
  }, [files]);
  async function send(event) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try { await onSend(caption.trim(), asFile); }
    catch { setError('Не удалось добавить фото. Попробуйте ещё раз.'); sending.current = false; setBusy(false); }
  }
  if (!previews.length) return null;
  return <Modal id="chat-photo-composer" className="chat-photo-composer" labelledBy="chat-photo-composer-title" onClose={() => { if (!sending.current) onClose(); }}>
    <form onSubmit={send} aria-busy={busy}>
      <header><h2 id="chat-photo-composer-title">{files.length === 1 ? 'Фото' : `Вложения · ${files.length}`}</h2><div className="chat-photo-header-actions"><button className="chat-photo-add" type="button" aria-label="Добавить фото" disabled={busy || files.length >= 5} onClick={() => picker.current?.click()}><Icon name="plus" /></button><CloseButton label="Отменить отправку фото" onClick={() => { if (!sending.current) onClose(); }} /></div></header>
      <div className={`chat-photo-preview${previews.length > 1 ? ' is-multiple' : ''}`} style={{ '--preview-ratio': previews[0].ratio || 4 / 3 }}>
        {previews.map(item => item.image ? <img key={item.url} src={item.url} alt={item.file.name} /> : <div className="chat-photo-preview-file" key={item.url}><Icon name="file" /><span>{item.file.name}</span></div>)}
      </div>
      <footer><div className="chat-photo-caption-field"><label className="visually-hidden" htmlFor="chat-photo-caption">Подпись к фото</label><textarea id="chat-photo-caption" name="caption" placeholder="Подпись к фото…" value={caption} onChange={event => setCaption(event.target.value)} maxLength={4000} rows={2} disabled={busy} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} /></div>
        <p className="chat-photo-composer-error" role="status">{error}</p><div className="chat-photo-actions"><input className="visually-hidden" type="file" accept="image/*" multiple ref={picker} tabIndex={-1} aria-hidden="true" onChange={event => { setError(onAdd?.([...event.target.files]) || ''); event.target.value = ''; }} /><label className="chat-photo-file-option"><input type="checkbox" checked={asFile} onChange={event => setAsFile(event.target.checked)} disabled={busy} /><span>Отправить как файл</span></label><button type="submit" className="chat-photo-send" disabled={busy}>{busy ? 'Отправка…' : 'Отправить'}<Icon name="arrow" /></button></div>
      </footer>
    </form>
  </Modal>;
}
