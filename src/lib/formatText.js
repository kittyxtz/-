const numbers = new Intl.NumberFormat('ru-RU');
const plurals = new Intl.PluralRules('ru-RU');
const percentages = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 0 });

export function participantCount(count) {
  return `${numbers.format(count)} ${{ one: 'участник', few: 'участника', many: 'участников', other: 'участника' }[plurals.select(count)]}`;
}

export function chatCount(count) {
  return `${numbers.format(count)} ${{ one: 'чат', few: 'чата', many: 'чатов', other: 'чата' }[plurals.select(count)]}`;
}

export function selectedMessageCount(count) {
  return `Выбрано ${numbers.format(count)} ${{ one: 'сообщение', few: 'сообщения', many: 'сообщений', other: 'сообщения' }[plurals.select(count)]}`;
}

export const formatPercent = value => percentages.format(value / 100);
