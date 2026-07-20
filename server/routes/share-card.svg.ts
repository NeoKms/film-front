const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character,
  );

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const name = escapeXml(String(query.name || 'Наш фильм').slice(0, 72));
  const year = escapeXml(String(query.year || '').slice(0, 4));
  setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8');
  setHeader(event, 'cache-control', 'public, max-age=86400');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#191d27"/><stop offset="1" stop-color="#090b10"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1040" cy="80" r="310" fill="#fcd34d" opacity=".08"/><text x="90" y="110" fill="#fcd34d" font-family="Arial,sans-serif" font-size="28" font-weight="700" letter-spacing="5">FILM TOGETHER</text><text x="90" y="250" fill="#fff" font-family="Arial,sans-serif" font-size="62" font-weight="700">${name}</text><text x="90" y="330" fill="#a1a1aa" font-family="Arial,sans-serif" font-size="38">${year}</text><text x="90" y="520" fill="#d4d4d8" font-family="Arial,sans-serif" font-size="28">Мы выбрали этот фильм вместе</text><rect x="90" y="555" width="260" height="7" rx="4" fill="#fcd34d"/></svg>`;
});
