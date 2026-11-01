import { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { CloseButton, Modal } from './Primitives';
import { downloadBlob } from '../lib/downloads';

export function attachmentUrl(file) { return file.url || file.href || ''; }
export function isImageFile(file) { return file.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(file.title); }
export function saveAttachment(file) {
  if (file.unavailable || (!file.blob && !attachmentUrl(file))) return;
  if (file.blob) { downloadBlob(file.blob, file.title); return; }
  const link = document.createElement('a'); link.href = attachmentUrl(file); link.download = file.title; document.body.append(link); link.click(); link.remove();
}
export function AttachmentPreview({ file, onClose }) {
  const [text, setText] = useState(''), [loading, setLoading] = useState(true), [failed, setFailed] = useState(Boolean(file.unavailable));
  const image = isImageFile(file), textual = file.type?.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.title);
  useEffect(() => {
    let active = true;
    if (textual && !file.unavailable) (file.blob ? file.blob.text() : fetch(attachmentUrl(file)).then(response => { if (!response.ok) throw new Error(); return response.text(); })).then(value => { if (active) { setText(value.slice(0, 30000)); setLoading(false); } }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [file]);
  return <Modal id="attachment-preview" className="product-dialog attachment-preview" labelledBy="attachment-title" onClose={onClose}><CloseButton onClick={onClose} /><div className="attachment-heading"><span className="product-dialog-symbol"><Icon name="file" /></span><div><h2 id="attachment-title">{file.title}</h2><p>{file.detail}</p></div></div>{image && !failed ? <img className="attachment-image" src={attachmentUrl(file)} alt={file.title} onError={() => setFailed(true)} /> : textual && !failed ? <pre className="attachment-text">{loading ? 'Загрузка…' : text || 'Файл пуст.'}</pre> : <div className="product-empty"><Icon name="file" /><p>{file.unavailable ? 'Оригинал файла недоступен.' : 'Скачайте файл, чтобы открыть его в подходящем приложении.'}</p></div>}{failed && <p role="status">{file.unavailable ? 'Файл не сохранился в браузере. Попросите отправить его повторно.' : 'Не удалось открыть предпросмотр. Попробуйте скачать файл.'}</p>}<button type="button" className="product-button is-primary" disabled={file.unavailable} onClick={() => saveAttachment(file)}><Icon name="download" />Скачать файл</button></Modal>;
}
export default function ChatAttachment({ file }) {
  const [preview, setPreview] = useState(false);
  const [ratio, setRatio] = useState(() => file.width > 0 && file.height > 0 ? file.width / file.height : 4 / 3);
  if (isImageFile(file) && !file.unavailable) return <><button type="button" className="chat-photo" style={{ '--photo-ratio': ratio }} onClick={() => setPreview(true)} aria-label={`Открыть фотографию: ${file.title}`}><img src={attachmentUrl(file)} alt={file.title} loading="lazy" onLoad={event => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight); }} /></button>{preview && <AttachmentPreview file={file} onClose={() => setPreview(false)} />}</>;
  return <><div className={`chat-file${file.type?.startsWith('image/') ? ' is-image-file' : ''}`}><button type="button" className="chat-file-open" onClick={() => setPreview(true)} aria-label={`Открыть файл: ${file.title}`}>{file.type?.startsWith('image/') && !file.unavailable ? <img src={attachmentUrl(file)} alt="" /> : <span className="chat-file-symbol"><Icon name="file" /></span>}<span className="chat-file-copy"><strong>{file.title}</strong><small>{file.detail}</small></span></button><button type="button" className="chat-file-download" disabled={file.unavailable} onClick={() => saveAttachment(file)} aria-label={`Скачать файл: ${file.title}`}><Icon name="download" /></button></div>{preview && <AttachmentPreview file={file} onClose={() => setPreview(false)} />}</>;
}
