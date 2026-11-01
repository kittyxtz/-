import {useState} from "react";
import { Icon } from "../components/Icons";
import MeetingPanel from "../components/MeetingPanel";
import Scenarios from "../components/Scenarios";
import DevicePreview from "../components/DevicePreview";
import UpcomingMeeting from "../components/UpcomingMeeting";
export default function HomePage({name,setName,tone,openLobby,openMeetings}){const [mode,setMode]=useState(new URLSearchParams(location.search).has("room")?"join":"create");return (<main id="main" className="page-width">
    <section className="hero" aria-label="Создать встречу или присоединиться">
      <div className="hero-panorama" aria-hidden="true"><picture><source media="(min-width: 761px)" srcSet="assets/air-ribbon-extended.webp" /><img className="air-image" src="assets/air-ribbon.webp" alt="" fetchPriority="high" width="1774" height="887" /></picture></div>
      <div className="hero-art">
        <img className="air-image hero-mobile-art" src="assets/air-ribbon.webp" alt="" width="1254" height="1254" />
        <div className="art-content"><span className="eyebrow" aria-hidden="true"><span className="small-spark">✳</span></span><h1>На связи.<br />На одной<br />волне<span className="title-dot">.</span></h1><p className="hero-description">Видеовстречи по ссылке.<br />Без регистрации и лишних шагов.</p></div>
      </div>
      <MeetingPanel {...{name,setName,mode,setMode,openLobby,openMeetings}} />
    </section>

    <UpcomingMeeting />
    <Scenarios />

    <DevicePreview {...{name,tone,openLobby}} />

    <section className="landing-invitation" aria-labelledby="invitation-title"><span className="invitation-air" aria-hidden="true"><Icon name="air" /></span><div><h2 id="invitation-title">Пора созвониться?</h2></div><a className="primary-button" href="#main" onClick={()=>setMode("create")}>Создать встречу</a></section>
  </main>);}
