import ChatActionMenu from './ChatActionMenu';
export default function ChatContextMenu({ chat, ...props }) {
  const items = [
    { id: 'pin', icon: 'pin', label: chat.pinned ? 'Открепить' : 'Закрепить' },
    ...(chat.kind === 'personal' ? [{ id: 'block', icon: 'block', label: chat.blocked ? 'Разблокировать' : 'Заблокировать' }] : []),
    { id: 'delete', icon: 'trash', label: 'Удалить чат', danger: true },
  ];
  return <ChatActionMenu {...props} label={`Действия: ${chat.title}`} items={items} />;
}
