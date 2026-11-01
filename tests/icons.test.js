import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconGeometry } from '../src/lib/iconGeometry.js';

test('every named interface icon resolves to a nonempty shared glyph', () => {
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) scan(path);
      else if (path.endsWith('.jsx')) {
        const source = readFileSync(path, 'utf8');
        for (const match of source.matchAll(/<Icon\b[^>]*\bname="([\w-]+)"/g)) {
          assert.ok(iconGeometry[match[1]]?.length, `${path}: missing ${match[1]}`);
        }
      }
    }
  }
  scan(fileURLToPath(new URL('../src', import.meta.url)));
});

test('glyphs contain only themeable SVG geometry', () => {
  for (const [name, geometry] of Object.entries(iconGeometry)) {
    assert.ok(geometry.length > 0, name);
    for (const [tag, props] of geometry) {
      assert.ok(['path', 'circle', 'rect'].includes(tag), `${name}: ${tag}`);
      assert.ok(!props.href && !props.style && !props.onClick, name);
      for (const color of [props.fill, props.stroke].filter(Boolean)) assert.ok(['none', 'currentColor'].includes(color), name);
      if (tag === 'path') assert.ok(props.d && !/NaN|undefined|Infinity/.test(props.d), name);
    }
  }
});
