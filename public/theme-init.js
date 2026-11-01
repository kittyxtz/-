// Apply the saved mode before the application renders. Older "monet" was OLED.
try {
  const saved = localStorage.getItem('sozvon-theme');
  const id = ['dusk', 'tide'].includes(saved) ? 'olive' : saved === 'monet' ? 'oled' : saved;
  const valid = ['light', 'dark', 'sage', 'linen', 'porcelain', 'olive', 'ember', 'iris', 'oled', 'monet-system'];
  if (valid.includes(id)) {
    const dark = id === 'monet-system' ? matchMedia('(prefers-color-scheme: dark)').matches : ['dark', 'olive', 'ember', 'iris', 'oled'].includes(id);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themePreset = id;
  }
} catch { /* The default light theme also works without storage. */ }
