import { useId } from 'react';
import { Icon } from './Icons';

export default function AnimatedDisclosure({ expanded, onExpanded, children }) {
  const contentId = useId();
  return <div className="meeting-options" id="room-field" data-expanded={expanded}>
    <button type="button" className="title-toggle meeting-secondary-action" aria-expanded={expanded} aria-controls={contentId} aria-label={expanded ? 'Скрыть название' : 'Добавить название'} onClick={() => onExpanded(!expanded)}>
      <span className="title-toggle-icon meeting-secondary-icon" aria-hidden="true"><Icon name="plus" /></span>
      <span className="title-toggle-label" aria-hidden="true"><span>Добавить название</span><span>Скрыть название</span></span>
    </button>
    <div id={contentId} className="title-reveal-stage" inert={!expanded} aria-hidden={!expanded}><div className="title-reveal">{children}</div></div>
  </div>;
}
