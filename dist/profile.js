'use strict';
const $ = selector => document.querySelector(selector);
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const cleanText = value => typeof value === 'string' ? value : '';
$('#profile-name').value = cleanText(read('sozvon-name', ''));
$('#profile-bio').value = cleanText(read('sozvon-bio', ''));
const savedTone = read('sozvon-avatar', 'blue');
if (['blue','mint','lavender'].includes(savedTone)) $(`input[value="${savedTone}"]`).checked = true;
function refreshPreview() {
  const name = $('#profile-name').value.trim();
  const tone = $('input[name=avatarColor]:checked').value;
  $('#preview-name').textContent = name || 'Ваше имя';
  $('#preview-bio').textContent = $('#profile-bio').value.trim() || 'Рады быть рядом';
  for (const id of ['profile-avatar','header-avatar']) { $(`#${id}`).textContent = name.slice(0, 1).toUpperCase() || 'Я'; $(`#${id}`).dataset.tone = tone; }
}
refreshPreview();
$('#profile-form').addEventListener('input', () => { refreshPreview(); $('#profile-name').removeAttribute('aria-invalid'); $('#profile-error').hidden = true; $('#profile-status').textContent = ''; });
$('#profile-form').addEventListener('submit', event => {
  event.preventDefault(); const name = $('#profile-name').value.trim();
  if (!name) { $('#profile-error').textContent = 'Введите имя, которое увидят собеседники.'; $('#profile-error').hidden = false; $('#profile-name').setAttribute('aria-invalid','true'); $('#profile-name').focus(); return; }
  try {
    const keys = ['sozvon-name','sozvon-bio','sozvon-avatar'];
    const values = [name,$('#profile-bio').value.trim(),$('input[name=avatarColor]:checked').value];
    const previous = keys.map(key => localStorage.getItem(key));
    try { keys.forEach((key,index) => localStorage.setItem(key,JSON.stringify(values[index]))); }
    catch (error) { keys.forEach((key,index) => { try { if (previous[index] === null) localStorage.removeItem(key); else localStorage.setItem(key,previous[index]); } catch {} }); throw error; }
    $('#profile-name').value = name; refreshPreview(); $('#profile-status').textContent = 'Изменения сохранены';
  } catch { $('#profile-error').textContent = 'Разрешите хранение данных в браузере и сохраните профиль ещё раз.'; $('#profile-error').hidden = false; $('#profile-name').focus(); }
});
function updateThemeLabel() { $('#theme-toggle').setAttribute('aria-label',document.documentElement.dataset.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'); }
updateThemeLabel();
$('#theme-toggle').addEventListener('click', () => {
  const root = document.documentElement; root.classList.add('theme-changing');
  const dark = root.dataset.theme !== 'dark'; root.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('sozvon-theme',dark ? 'dark' : 'light'); } catch {}
  $('meta[name=theme-color]').content = dark ? '#101722' : '#f8f9fc'; updateThemeLabel();
  void root.offsetHeight; requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-changing')));
});
