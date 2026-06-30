export const fmtNum = (n) => (n != null && !isNaN(n)) ? n.toLocaleString('pt-BR') : '-';

export const fmtBRL = (n) => {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1000) {
    const bi = n / 1000;
    return 'R$ ' + bi.toLocaleString('pt-BR', {
      minimumFractionDigits: bi % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }) + ' bi';
  }
  return 'R$ ' + n.toLocaleString('pt-BR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  }) + ' mi';
};

export const fmtArea = (n) => n
  ? (n / 10000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ha'
  : '-';

export function isLinked(item) {
  return !!(item.e && item.e.regional !== null && item.e.regional !== undefined);
}

export function getCentroid(item) {
  if (item.c) return item.c;
  if (item.p && item.p.length > 0 && item.p[0].length > 0) {
    const coords = item.p[0];
    const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return [lat, lng];
  }
  return null;
}
