(() => {
  const $ = (s) => document.querySelector(s);

  let token = sessionStorage.getItem('cardsaas_token');
  let me = null;
  let colors = [];
  let selectedColor = 'emerald';

  // ---------------------------------------------------------------- utilidades
  async function api(url, method = 'GET', body) {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) logout();
    if (!res.ok) throw new Error(data.error || 'Ocurrió un error inesperado.');
    return data;
  }

  function toast(message, type = 'ok') {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = message;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function showLoginError(message) {
    const p = $('#login-error');
    p.textContent = message || '';
    p.classList.toggle('hidden', !message);
  }

  function show(view) {
    $('#view-login').classList.toggle('hidden', view !== 'login');
    $('#view-dash').classList.toggle('hidden', view !== 'dash');
  }

  const isPro = () => me && me.plan === 'pro';

  // ---------------------------------------------------------------- acceso
  async function enter(newToken) {
    token = newToken;
    sessionStorage.setItem('cardsaas_token', token);
    await loadDash();
  }

  function logout() {
    token = null;
    me = null;
    sessionStorage.removeItem('cardsaas_token');
    show('login');
  }

  async function quickLogin(username) {
    showLoginError('');
    try {
      const { token: t } = await api('/api/login', 'POST', { username });
      await enter(t);
    } catch (e) {
      showLoginError(e.message);
    }
  }

  document.querySelectorAll('[data-quick]').forEach((btn) =>
    btn.addEventListener('click', () => quickLogin(btn.dataset.quick))
  );

  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoginError('');
    const username = $('#reg-username').value.trim().toLowerCase();
    try {
      const { token: t } = await api('/api/register', 'POST', { username });
      await enter(t);
      toast('¡Cuenta creada! Ya tienes tu propio espacio.');
    } catch (err) {
      showLoginError(err.message);
    }
  });

  $('#btn-logout').addEventListener('click', logout);

  // ---------------------------------------------------------------- panel
  async function loadDash() {
    const data = await api('/api/me');
    me = data.user;
    colors = data.colors;
    renderAll();
    show('dash');
  }

  function renderAll() {
    fillForm();
    renderPlan();
    renderSwatches();
    renderPublicLink();
    updatePreview();
  }

  function fillForm() {
    $('#f-name').value = me.name;
    $('#f-bio').value = me.bio;
    $('#f-l1-label').value = me.link1.label;
    $('#f-l1-url').value = me.link1.url;
    $('#f-l2-label').value = me.link2.label;
    $('#f-l2-url').value = me.link2.url;
    selectedColor = me.color;
  }

  function planBadge(pro) {
    const b = document.createElement('span');
    b.className =
      'inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ' +
      (pro
        ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
        : 'border-slate-600 bg-slate-800 text-slate-300');
    b.textContent = pro ? 'Plan Pro' : 'Plan Gratis';
    return b;
  }

  function renderPlan() {
    const pro = isPro();

    $('#tenant-chip').textContent = `Espacio aislado de: ${me.username}`;
    $('#plan-badge-top').replaceChildren(planBadge(pro));
    $('#plan-badge').replaceChildren(planBadge(pro));
    $('#plan-price').textContent = pro ? 'USD 5 / mes (simulado)' : 'USD 0 / mes';

    const btn = $('#btn-plan');
    btn.textContent = pro ? 'Cancelar Pro' : 'Simular Suscripción Pro';
    btn.className = 'btn ' + (pro ? 'btn-danger' : 'btn-primary');

    const rows = [
      ['Colores', pro ? '8 (6 premium)' : '2 básicos'],
      ['Enlaces', pro ? '2 enlaces' : '1 enlace'],
      ['Marca de agua', pro ? 'Sin marca' : 'Incluida'],
    ];
    const ul = $('#plan-features');
    ul.replaceChildren();
    rows.forEach(([k, v]) => {
      const li = document.createElement('li');
      li.className =
        'rounded-xl border p-3 ' +
        (pro ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/60');
      const a = document.createElement('p');
      a.className = 'text-xs text-slate-500';
      a.textContent = k;
      const b = document.createElement('p');
      b.className = 'mt-0.5 font-semibold ' + (pro ? 'text-emerald-300' : 'text-slate-200');
      b.textContent = v;
      li.append(a, b);
      ul.appendChild(li);
    });

    // Segundo enlace: solo editable en Pro
    ['#f-l2-label', '#f-l2-url'].forEach((s) => ($(s).disabled = !pro));
    $('#f-l2-url').placeholder = pro ? 'miportafolio.com' : 'Disponible en el Plan Pro';
    document.querySelectorAll('.pro-tag').forEach((t) => t.classList.toggle('hidden', pro));
  }

  const LOCK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function renderSwatches() {
    const root = $('#swatches');
    root.replaceChildren();
    [
      ['Básicos', colors.filter((c) => !c.premium)],
      ['Premium', colors.filter((c) => c.premium)],
    ].forEach(([title, list]) => {
      const group = document.createElement('div');
      const h = document.createElement('p');
      h.className = 'mb-2 text-xs text-slate-500';
      h.textContent = title === 'Premium' ? 'Premium · Plan Pro' : 'Básicos';
      const row = document.createElement('div');
      row.className = 'flex flex-wrap gap-3';

      list.forEach((c) => {
        const locked = c.premium && !isPro();
        const s = document.createElement('button');
        s.type = 'button';
        s.className = 'swatch' + (locked ? ' locked' : '');
        s.style.background = c.hex;
        s.title = locked ? `${c.name} · exclusivo del Plan Pro` : c.name;
        s.setAttribute('aria-pressed', String(c.id === selectedColor));
        s.setAttribute('aria-label', c.name);
        if (locked) s.innerHTML = LOCK_SVG;
        s.addEventListener('click', () => {
          if (locked) return toast('Ese color se desbloquea con el Plan Pro.', 'error');
          selectedColor = c.id;
          renderSwatches();
          updatePreview();
        });
        row.appendChild(s);
      });

      group.append(h, row);
      root.appendChild(group);
    });
  }

  function renderPublicLink() {
    const path = '/u/' + me.username;
    $('#public-url').textContent = location.origin + path;
    $('#btn-open').href = path;
  }

  // ---------------------------------------------------------------- vista previa
  function hostOf(url) {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0];
  }

  function previewLink(labelSel, urlSel) {
    const url = $(urlSel).value.trim();
    if (!url) return null;
    return { label: $(labelSel).value.trim() || hostOf(url), url };
  }

  function updatePreview() {
    const hex = (colors.find((c) => c.id === selectedColor) || colors[0]).hex;
    window.renderCard(
      $('#preview'),
      {
        name: $('#f-name').value.trim(),
        bio: $('#f-bio').value.trim(),
        link1: previewLink('#f-l1-label', '#f-l1-url'),
        link2: isPro() ? previewLink('#f-l2-label', '#f-l2-url') : null,
        color: hex,
        watermark: !isPro(),
      },
      { interactive: false }
    );
  }

  ['#f-name', '#f-bio', '#f-l1-label', '#f-l1-url', '#f-l2-label', '#f-l2-url'].forEach((s) =>
    $(s).addEventListener('input', updatePreview)
  );

  // ---------------------------------------------------------------- guardar
  async function save(silent = false) {
    const body = {
      name: $('#f-name').value,
      bio: $('#f-bio').value,
      link1: { label: $('#f-l1-label').value, url: $('#f-l1-url').value },
      color: selectedColor,
    };
    if (isPro()) body.link2 = { label: $('#f-l2-label').value, url: $('#f-l2-url').value };

    const data = await api('/api/me', 'PUT', body);
    me = data.user;
    if (!silent) toast('Cambios guardados. Tu tarjeta pública ya está actualizada.');
    return me;
  }

  $('#form-profile').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-save');
    btn.disabled = true;
    try {
      await save();
      renderAll();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // ---------------------------------------------------------------- plan Gratis / Pro
  $('#btn-plan').addEventListener('click', async () => {
    const next = isPro() ? 'free' : 'pro';
    const btn = $('#btn-plan');
    btn.disabled = true;
    try {
      await save(true); // no se pierde lo que estaba escribiendo
      const data = await api('/api/me/plan', 'POST', { plan: next });
      me = data.user;
      colors = data.colors;
      renderAll();
      toast(
        next === 'pro'
          ? 'Plan Pro activado: colores premium, segundo enlace y sin marca de agua.'
          : 'Plan Pro cancelado: vuelves al Plan Gratis.'
      );
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // ---------------------------------------------------------------- copiar enlace
  $('#btn-copy').addEventListener('click', async () => {
    const url = location.origin + '/u/' + me.username;
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado.');
    } catch {
      window.prompt('Copia el enlace:', url);
    }
  });

  // ---------------------------------------------------------------- arranque
  if (token) {
    loadDash().catch(() => show('login'));
  } else {
    show('login');
  }
})();
