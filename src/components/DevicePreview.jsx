import {Icon} from "./Icons";
export default function DevicePreview({name,tone,openLobby}){return (<section className="studio-section device-section" aria-labelledby="studio-title">
      <div className="studio-copy">
        <span className="section-kicker">Перед встречей</span>
        <h2 id="studio-title">Проверьте<br />камеру и звук</h2>
        <p>Камера и микрофон выключены, пока вы их не включите.</p>
        <button className="studio-cta" id="try-room" onClick={()=>openLobby()}><Icon name="video"/>Проверить устройства</button>
      </div>
      <div className="device-preview-window">
        <div className="device-window-bar"><span><Icon name="video" />Предпросмотр</span><span className="device-private"><Icon name="lock" />Только для вас</span></div>
        <div className="device-preview-stage">
          <span className="device-preview-status"><Icon name="video" />Камера выключена</span>
          <div className="device-camera-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <span className="studio-avatar" id="studio-preview-avatar" data-tone={tone} aria-hidden="true">{(name.trim()||"Я").slice(0,1).toUpperCase()}</span>
          <div className="device-preview-person"><span id="studio-preview-name">{name.trim()||"Вы"}</span><span className="studio-mic-off" role="img" aria-label="Микрофон выключен"><Icon name="mic" /></span></div>
        </div>
        <div className="device-window-tools" aria-label="Проверка устройств">
          <button aria-label="Проверить камеру в предпросмотре" onClick={()=>openLobby(undefined,"camera")}><Icon name="video" /><span>Камера</span></button>
          <button aria-label="Проверить микрофон в предпросмотре" onClick={()=>openLobby(undefined,"mic")}><Icon name="mic" /><span>Микрофон</span></button>
          <button aria-label="Проверить экран в предпросмотре" onClick={()=>openLobby(undefined,"screen")}><Icon name="monitor" /><span>Экран</span></button>
        </div>
      </div>
    </section>);}
