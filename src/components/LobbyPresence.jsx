import { useState } from 'react';
import { Icon } from './Icons';
import ChatAvatar from './ChatAvatar';
import ChatProfileDialog from './ChatProfileDialog';
import { useApp } from '../context';

function DeviceState({ icon, label, off = false, sharing = false }) {
  return <span role="img" aria-label={label} title={label} className={`lobby-person-state${off ? ' is-off' : ''}${sharing ? ' is-sharing' : ''}`}><Icon name={icon} /></span>;
}
export default function LobbyPresence({ attendees = [] }) {
  const [profile, setProfile] = useState(null);
  const { notify, openContactChat } = useApp();
  async function copyContact(value) {
    try { await navigator.clipboard.writeText(value); return true; }
    catch { notify('Не удалось скопировать. Попробуйте ещё раз.'); return false; }
  }
  return <><section className="lobby-presence" aria-label="Участники встречи"><div className="lobby-presence-heading">{attendees.length ? <>Участники <span>{attendees.length}</span></> : 'Участников пока нет'}</div>{attendees.length > 0 && <ul>{attendees.map(person => <li key={person.id}><button type="button" className="lobby-person-profile" data-press-feedback="css" aria-label={`Открыть профиль: ${person.title}`} aria-haspopup="dialog" onClick={() => setProfile(person)}><ChatAvatar chat={person} small /><span className="lobby-person-name" title={person.title}>{person.title}</span></button><span className="lobby-person-devices">{person.sharing && <DeviceState icon="monitor" label="Демонстрирует экран" sharing />}<DeviceState icon="mic" label={person.mic ? 'Микрофон включён' : 'Микрофон выключен'} off={!person.mic} /><DeviceState icon="chat-video" label={person.camera ? 'Камера включена' : 'Камера выключена'} off={!person.camera} /></span></li>)}</ul>}</section>{profile && <ChatProfileDialog profile={profile} members={[]} onClose={() => setProfile(null)} onWrite={openContactChat} onCopy={copyContact} />}</>;
}
