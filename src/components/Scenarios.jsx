import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import useMediaQuery from '../lib/useMediaQuery';
import useMotion from '../lib/useMotion';

const stories = [
  { key: 'work', tab: 'Работа', headline: ['Обсудите', 'рабочие планы.'], description: 'Обсудите задачи, покажите проект и договоритесь о сроках.', wave: [5, 14, 9, 23, 16, 7, 20, 12, 5] },
  { key: 'close', tab: 'Близкие', headline: ['Поделитесь', 'новостями.'], description: 'Расскажите, как прошёл день, и узнайте, как дела у близких.', wave: [4, 8, 16, 24, 19, 13, 8, 5, 3] },
  { key: 'ideas', tab: 'Идеи', headline: ['Разберите', 'идею вместе.'], description: 'Покажите наброски и обсудите варианты.', wave: [12, 5, 20, 9, 25, 7, 16, 22, 10] },
];

export default function Scenarios() {
  const [index, setIndex] = useState(0);
  const narrow = useMediaQuery('(max-width: 760px)');
  const tabs = useRef(null), marker = useRef(null), panel = useRef(null), page = useRef(null), pending = useRef(null);
  const transition = useMotion(), wave = useMotion();
  const story = stories[index];
  const positionMarker = useCallback((animate = false) => {
    const list = tabs.current, dot = marker.current;
    if (!list || !dot) return;
    const number = list.querySelector('[aria-selected="true"] .scenario-number');
    const rect = number.getBoundingClientRect(), origin = list.getBoundingClientRect();
    if (!animate) list.classList.remove('marker-motion');
    dot.style.transform = `translate3d(${rect.left - origin.left - list.clientLeft + list.scrollLeft + (rect.width - dot.offsetWidth) / 2}px,${rect.top - origin.top - list.clientTop + list.scrollTop + (rect.height - dot.offsetHeight) / 2}px,0)`;
    dot.style.opacity = '1';
    if (!animate) { void dot.offsetWidth; list.classList.add('marker-motion'); }
  }, []);
  useLayoutEffect(() => {
    const update = () => positionMarker(false);
    const observer = new ResizeObserver(update); observer.observe(tabs.current); observer.observe(marker.current);
    document.fonts.ready.then(update);
    return () => observer.disconnect();
  }, [positionMarker]);
  useLayoutEffect(() => positionMarker(false), [narrow, positionMarker]);
  useLayoutEffect(() => {
    const change = pending.current; pending.current = null;
    positionMarker(Boolean(change));
    if (!change) return;
    const { ghost, transform, opacity, direction, heights } = change;
    const distance = Math.min(100, panel.current.clientHeight * .25), easing = 'cubic-bezier(.2,0,0,1)';
    if (ghost) {
      const outgoing = transition.animate(ghost, [{ transform: transform === 'none' ? 'translateY(0)' : transform, opacity }, { transform: `translateY(${-direction * distance}px)`, opacity: 0 }], { duration: 260, easing, fill: 'both' });
      outgoing?.finished.then(() => transition.remove(ghost), () => transition.remove(ghost));
    }
    transition.animate(page.current, [{ transform: `translateY(${direction * distance}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 320, easing });
    page.current.querySelectorAll('.scenario-wave i').forEach((bar, i) => {
      const height = stories[index].wave[i];
      wave.animate(bar, [{ height: heights[i] }, { height: `${Math.max(3, height * .4)}px`, offset: .2 }, { height: `${Math.min(26, height * 1.15)}px`, offset: .48 }, { height: `${height * .5}px`, offset: .72 }, { height: `${height}px` }], { duration: 560, delay: i * 30, easing: 'ease-in-out' });
    });
  }, [index, positionMarker, transition, wave]);
  function select(next, focus = false, directionHint = 0) {
    if (next !== index) {
      const node = page.current, current = getComputedStyle(node);
      const transform = current.transform, opacity = Number(current.opacity);
      const heights = [...node.querySelectorAll('.scenario-wave i')].map(bar => getComputedStyle(bar).height);
      transition.clear(); wave.clear();
      const ghost = transition.snapshot(node, panel.current, 'scenario-ghost');
      if (ghost) Object.assign(ghost.style, { left: `${node.offsetLeft}px`, top: `${node.offsetTop}px`, width: `${node.offsetWidth}px`, height: `${node.offsetHeight}px` });
      pending.current = { ghost, transform, opacity, heights, direction: directionHint || Math.sign(next - index) };
      setIndex(next);
    }
    if (focus) tabs.current.querySelectorAll('[role="tab"]')[next].focus();
  }
  return <section className="conversation-section" aria-labelledby="conversation-title"><div className="scenario-layout"><div className="scenario-intro"><h2 id="conversation-title">Поводы<br />для встречи</h2>
    <div ref={tabs} className="scenario-tabs" role="tablist" aria-label="Поводы для встречи" aria-orientation={narrow ? 'horizontal' : 'vertical'} onKeyDown={event => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + 3) % 3;
      select(next, true, event.key === 'Home' || ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1);
    }}><span ref={marker} className="scenario-marker" aria-hidden="true" />{stories.map((item, i) => <button type="button" key={item.key} id={`scenario-${item.key}-tab`} role="tab" aria-selected={index === i} aria-controls="scenario-panel" tabIndex={index === i ? 0 : -1} onClick={() => select(i)}><span className="scenario-number" aria-hidden="true"><span>0{i + 1}</span></span><span>{item.tab}</span></button>)}</div>
  </div><div ref={panel} className="scenario-panel" id="scenario-panel" role="tabpanel" aria-labelledby={`scenario-${story.key}-tab`} tabIndex={0} data-scene={story.key}><div className="scenario-art" aria-hidden="true"><span className="scenario-sphere" /><svg viewBox="0 0 700 500" preserveAspectRatio="xMidYMid slice"><path d="M420-100C100 60 760 165 470 350S230 620 780 460" /><path d="M448-100C128 60 788 165 498 350S258 620 808 460" /><path d="M476-100C156 60 816 165 526 350S286 620 836 460" /></svg><span className="scenario-star">✳</span></div>
    <div ref={page} className="scenario-page" id="scenario-page"><div className="scenario-story"><h3 id="scenario-headline">{story.headline[0]}{' '}<br />{story.headline[1]}</h3><p id="scenario-description">{story.description}</p></div><div className="scenario-bottomline" aria-hidden="true"><span className="scenario-wave">{story.wave.map((height, i) => <i key={i} style={{ height }} />)}</span></div></div>
  </div></div></section>;
}
