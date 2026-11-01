import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sidebarWidth, sidebarStep, sidebarDragWidth, sidebarReleasedWidth } from '../src/lib/chatSidebar.js';

test('sidebar keeps a readable minimum, then snaps to avatars instead of squeezing text', () => {
  assert.equal(sidebarWidth(256), 256);
  assert.equal(sidebarWidth(255), 76);
  assert.equal(sidebarWidth(-100), 76);
  assert.equal(sidebarWidth(500), 440);
  assert.equal(sidebarWidth(400, 280), 280);
});

test('divider stays still until a short deliberate drag toggles the sidebar in either direction', () => {
  assert.equal(sidebarDragWidth(255, 256), 256);
  assert.equal(sidebarDragWidth(209, 256), 256);
  assert.equal(sidebarDragWidth(208, 256), 76);
  assert.equal(sidebarDragWidth(180, 256), 76);
  assert.equal(sidebarDragWidth(90, 256), 76);
  assert.equal(sidebarDragWidth(77, 256), 76);
  assert.equal(sidebarDragWidth(76, 256), 76);
  assert.equal(sidebarDragWidth(60, 256), 76);
  assert.equal(sidebarDragWidth(100, 76), 76);
  assert.equal(sidebarDragWidth(123, 76), 76);
  assert.equal(sidebarDragWidth(124, 76), 256);
  assert.equal(sidebarDragWidth(180, 76), 256);
  assert.equal(sidebarDragWidth(255, 76), 256);
  assert.equal(sidebarDragWidth(256, 76), 256);
  assert.equal(sidebarDragWidth(320, 256), 320);
  assert.equal(sidebarReleasedWidth(255), 256);
  assert.equal(sidebarReleasedWidth(180), 256);
  assert.equal(sidebarReleasedWidth(101), 256);
  assert.equal(sidebarReleasedWidth(100), 256);
  assert.equal(sidebarReleasedWidth(76), 76);
});

test('keyboard resizing crosses the compact boundary in one step in either direction', () => {
  assert.equal(sidebarStep(272, -1), 256);
  assert.equal(sidebarStep(256, -1), 76);
  assert.equal(sidebarStep(76, -1), 76);
  assert.equal(sidebarStep(76, 1), 256);
  assert.equal(sidebarStep(256, 1), 272);
  assert.equal(sidebarStep(280, 1, 280), 280);
});
