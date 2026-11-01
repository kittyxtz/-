import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities';

export const defaultMonetSeed = '#6750a4';
export const normalizeMonetSeed = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : null;

export function monetTokens(source, dark) {
  const palette = themeFromSourceColor(argbFromHex(normalizeMonetSeed(source) || defaultMonetSeed));
  const scheme = (dark ? palette.schemes.dark : palette.schemes.light).toJSON();
  const color = role => hexFromArgb(scheme[role]);
  return {
    '--color-bg': color('background'), '--color-surface': color('surface'),
    '--color-subtle': color('surfaceVariant'), '--color-border': hexFromArgb(palette.palettes.neutralVariant.tone(dark ? 30 : 80)),
    '--color-input-border': color('outline'), '--color-text': color('onSurface'),
    '--color-secondary': color('onSurfaceVariant'), '--color-accent': color('primary'),
    '--color-accent-hover': hexFromArgb(palette.palettes.primary.tone(dark ? 85 : 35)),
    '--color-on-accent': color('onPrimary'), '--color-accent-soft': color('primaryContainer'),
    '--color-focus': color('primary'), '--calendar-ink': color('primary'),
    '--color-danger': color('error'), '--color-success': dark ? '#9cd5b1' : '#286344',
    '--field-glass': color('surface'), '--field-glint': color('outline'),
    '--field-edge': color('outline'), '--field-label': color('onSurfaceVariant'),
    '--field-icon': color('primary'), '--field-placeholder': color('onSurfaceVariant'),
    '--icon-surface': color('surfaceVariant'), '--icon-ink': color('onSurfaceVariant'),
    '--icon-edge': color('outline'), '--theme-hero': color('surfaceVariant'),
  };
}
