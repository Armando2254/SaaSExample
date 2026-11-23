// Vista pública: carga la tarjeta y se refresca cada 2 s para reflejar cambios casi en tiempo real
(() => {
  const username = decodeURIComponent(location.pathname.split('/')[2] || '');
  const root = document.getElementById('card-root');
  let last = '';

  function showNotFound() {
    root.replaceChildren();
    const box = document.createElement('div');
    box.className = 'rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center';
    const h = document.createElement('h1');
    h.className = 'text-xl font-bold';
    h.textContent = 'Tarjeta no encontrada';
    const p = document.createElement('p');
    p.className = 'mt-2 text-slate-400';
    p.textContent = `No existe ningún usuario llamado "${username}".`;
    box.append(h, p);
    root.appendChild(box);
  }

  async function refresh() {
    try {
      const res = await fetch('/api/public/' + encodeURIComponent(username), { cache: 'no-store' });
      if (res.status === 404) {
        if (last !== 'not-found') {
          last = 'not-found';
          document.title = 'No encontrada · CardSaaS';
          showNotFound();
        }
        return;
      }
      const text = await res.text();
      if (text === last) return;
      last = text;
      const data = JSON.parse(text);
      document.title = `${data.name} · CardSaaS`;
      window.renderCard(root, data, { interactive: true });
    } catch (_) {
      /* sin conexión momentánea: se reintenta en el siguiente ciclo */
    }
  }

  refresh();
  setInterval(refresh, 2000);
})();
