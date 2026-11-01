export const themes = [
  { id: 'light', label: 'Светлая', description: 'Светлый фон', mode: 'light', icon: 'sun', color: '#f8f9fc' },
  { id: 'dark', label: 'Тёмная', description: 'Тёмный фон', mode: 'dark', icon: 'moon', color: '#080808' },
  { id: 'sage', label: 'Шалфей', description: 'Мягкие зелёные оттенки', mode: 'light', icon: 'sun', color: '#f2f5f0' },
  { id: 'linen', label: 'Лён', description: 'Кремовый фон и терракота', mode: 'light', icon: 'sun', color: '#f4efe5' },
  { id: 'porcelain', label: 'Фарфор', description: 'Холодный белый и синий', mode: 'light', icon: 'sun', color: '#eff3f6' },
  { id: 'olive', label: 'Олива', description: 'Оливковый акцент', mode: 'dark', icon: 'moon', color: '#080808' },
  { id: 'ember', label: 'Медь', description: 'Тёплый оранжевый акцент', mode: 'dark', icon: 'moon', color: '#080808' },
  { id: 'iris', label: 'Ирис', description: 'Фиолетовый акцент', mode: 'dark', icon: 'moon', color: '#080808' },
  { id: 'oled', label: 'OLED-чёрная', description: 'Чистый чёрный и серые линии', mode: 'dark', icon: 'moon', color: '#000000', hidden: true },
  { id: 'monet-system', label: 'Monet', description: 'Следует теме системы и автоматически подбирает цвета', mode: 'system', icon: 'sun', color: '#f8f9fc' },
];

export function resolveTheme(id) {
  if (id === 'dusk' || id === 'tide') id = 'olive';
  if (id === 'monet') id = 'oled';
  return themes.find(theme => theme.id === id) || themes[0];
}

export function themeMode(id, systemDark = false) {
  const mode = resolveTheme(id).mode;
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
}
