import { mkdir, writeFile } from 'node:fs/promises';
import { iconGeometry } from '../src/lib/iconGeometry.js';

const attributes = props => Object.entries(props).map(([name, value]) => `${name === 'className' ? 'class' : name === 'pathLength' ? 'pathLength' : name}="${value}"`).join(' ');
const glyph = name => iconGeometry[name].map(([tag, props]) => `<${tag} ${attributes(props)}/>`).join('');
const svg = (name, size = 24) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph(name)}</svg>`;
const cards = Object.keys(iconGeometry).map(name => `<article data-icon="${name}"><div>${[16, 20, 24].map(size => svg(name, size)).join('')}</div><span>${name}</span></article>`).join('');
const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Иконки Созвона</title><style>@font-face{font-family:Onest;src:url('/assets/onest-variable.woff2')}*{box-sizing:border-box}body{font-family:Onest,system-ui;margin:0;padding:32px;background:#101010;color:#e8e8e8}h1{margin:0 0 8px;font-size:28px;font-weight:500}p{color:#aaa;font-size:14px;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(136px,1fr));gap:12px}article{padding:20px 12px 14px;border:1px solid #ffffff20;border-radius:16px;background:#171717}article>div{display:flex;align-items:center;justify-content:center;gap:12px;height:40px}article>span{display:block;font-size:12px;margin-top:12px;text-align:center;color:#b0b0b0}svg{flex-shrink:0}</style><h1>Иконки Созвона</h1><p>${Object.keys(iconGeometry).length} значков · 16, 20 и 24 px · единая геометрия</p><div class="grid">${cards}</div></html>`;
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/icon-review.html', html);
await writeFile('dist/icon-review.html', html);
await writeFile('public/assets/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#315bd8"/><g transform="translate(6 6) scale(1.5)" fill="none" stroke="#fff" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${glyph('air')}</g></svg>`);
await writeFile('dist/assets/favicon.svg', await (await import('node:fs/promises')).readFile('public/assets/favicon.svg'));
console.log(`Rendered ${Object.keys(iconGeometry).length} glyphs to dist/icon-review.html.`);
