// Ortak küçük arayüz yardımcıları

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// Kullanıcının yazdığı metni HTML içine güvenle koymak için
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 82.5 -> "82,5"
export const fmt = n => (n == null ? '' : n.toLocaleString('tr-TR', { maximumFractionDigits: 2 }));

// "82,5" ya da "82.5" -> 82.5 ; boş/geçersiz -> null
export function parseNum(value) {
  const t = String(value).trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const uid = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

// 754000 ms -> "12:34" ; 1 saati geçince "1:02:03"
export function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = n => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

// Alttan açılan panel. Geriye paneli kapatan fonksiyonu döndürür.
export function sheet(html, { tall = false, onMount } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `<div class="sheet${tall ? ' sheet-tall' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(overlay);
  document.body.classList.add('sheet-open');
  overlay.offsetHeight; // animasyonun başlaması için
  overlay.classList.add('open');

  const close = () => {
    overlay.classList.remove('open');
    if (document.querySelectorAll('.sheet-overlay.open').length === 0) document.body.classList.remove('sheet-open');
    setTimeout(() => overlay.remove(), 250);
  };
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-close]')) close();
  });
  onMount?.(overlay.firstElementChild, close);
  return close;
}

// iPhone tarzı seçenek menüsü: [{ label, onClick, danger?, primary? }]
export function actionSheet(actions, title) {
  sheet(`
    ${title ? `<p class="sheet-title">${esc(title)}</p>` : ''}
    <div class="action-list">
      ${actions.map((a, i) => `<button class="action${a.danger ? ' danger' : ''}${a.primary ? ' primary' : ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}
    </div>
    <button class="action cancel" data-close>Vazgeç</button>`, {
    onMount(panel, close) {
      panel.addEventListener('click', e => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        close();
        actions[b.dataset.i].onClick();
      });
    },
  });
}
