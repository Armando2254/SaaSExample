// Renderizador compartido de la tarjeta (se usa en la vista previa del panel y en /u/:username)
(function () {
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function initials(name) {
    return (
      String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || '?'
    );
  }

  function linkButton(link, hex, interactive) {
    const a = el('a', 'block w-full rounded-xl border px-4 py-3 text-center font-semibold text-slate-50 transition', link.label);
    a.style.borderColor = hex + '66';
    a.style.background = hex + '1f';
    a.onmouseenter = () => (a.style.background = hex + '40');
    a.onmouseleave = () => (a.style.background = hex + '1f');
    if (interactive) {
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    } else {
      a.href = '#';
      a.onclick = (e) => e.preventDefault();
    }
    return a;
  }

  // d = { name, bio, link1, link2, color (hex), watermark }
  window.renderCard = function (root, d, opts) {
    const interactive = !opts || opts.interactive !== false;
    const hex = d.color || '#10b981';
    root.replaceChildren();

    const card = el('article', 'relative overflow-hidden rounded-3xl border bg-slate-900 px-7 pt-10 pb-8 text-center shadow-2xl shadow-black/40');
    card.style.borderColor = hex + '40';
    card.style.backgroundImage = `radial-gradient(120% 55% at 50% 0%, ${hex}38, transparent 70%)`;

    const avatar = el('div', 'mx-auto grid h-24 w-24 place-items-center rounded-full text-3xl font-extrabold text-slate-950', initials(d.name));
    avatar.style.background = hex;
    avatar.style.boxShadow = `0 0 0 6px ${hex}26, 0 12px 40px ${hex}55`;
    card.appendChild(avatar);

    card.appendChild(el('h1', 'mt-6 text-2xl font-bold tracking-tight text-slate-50', d.name || 'Tu nombre'));
    if (d.bio) card.appendChild(el('p', 'mt-2 leading-relaxed text-slate-300', d.bio));

    const links = el('div', 'mt-7 space-y-3');
    [d.link1, d.link2].forEach((l) => {
      if (l && l.url) links.appendChild(linkButton(l, hex, interactive));
    });
    if (links.children.length) card.appendChild(links);

    if (d.watermark) {
      card.appendChild(el('p', 'mt-8 text-xs text-slate-500', 'Creado con CardSaaS Free'));
    }

    root.appendChild(card);
  };
})();
