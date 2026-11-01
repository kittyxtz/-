export default function ChatRow({ onMenu, onSelect, children, ...props }) {
  return <button type="button" {...props} data-press-feedback="css" onClick={onSelect} onContextMenu={event => {
    event.preventDefault(); onMenu(event.currentTarget);
  }} onKeyDown={event => {
    if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) { event.preventDefault(); onMenu(event.currentTarget); }
  }}>{children}</button>;
}
