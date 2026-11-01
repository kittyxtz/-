import { Icon } from './Icons';
import { CloseButton, Modal } from './Primitives';
import { helpQuestions } from '../lib/help';

export default function HelpDialog({ onClose, onDemo }) {
  return <Modal id="help-dialog" className="small-dialog" labelledBy="help-title" onClose={onClose}><CloseButton label="Закрыть справку" onClick={onClose} /><h2 id="help-title">Справка</h2><button type="button" className="text-button" id="demo-button" onClick={onDemo}>Проверить устройства <Icon name="arrow" /></button>{helpQuestions.map(({ question, answer }, index) => <details key={question} open={index === 0}><summary>{question}</summary><p>{answer}</p></details>)}</Modal>;
}
