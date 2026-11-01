import { createElement } from 'react';
import { iconGeometry } from '../lib/iconGeometry';

const shapes = name => (iconGeometry[name] || []).map(([tag, props], index) => createElement(tag, { ...props, key: index }));

export function Icon({ name, className = '', ...props }) {
  const labelled = Boolean(props['aria-label']);
  return <svg viewBox="0 0 24 24" className={`ui-icon ${className}`.trim()} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined} focusable="false" {...props}>{shapes(name)}</svg>;
}

export function IconSymbols() {
  return <svg className="svg-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">{Object.keys(iconGeometry).map(name => <symbol key={name} id={`i-${name}`} viewBox="0 0 24 24">{shapes(name)}</symbol>)}</svg>;
}
