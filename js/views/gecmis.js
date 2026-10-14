// Geçmiş sekmesi: ay takvimi, o ayın antrenman listesi ve antrenman detay sayfası.
// Adresler: #/gecmis (bu ay), #/gecmis/2026-10 (belirli ay), #/kayit/<id> (detay)
import * as db from '../db.js';
import { actionSheet, esc, fmt, toast } from '../ui.js';
import { workSets, workoutSetCount, workoutVolume, formatMinutes, setLabels } from '../workout-utils.js';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = d => dayKey(d).slice(0, 7);

function cardHtml(w, names) {
  const date = new Date(w.startedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
  return `
    <a class="card hist-card" href="#/kayit/${esc(w.id)}">
      <div class="hist-top">
        <span class="hist-name">${esc(w.name)}</span>
        <span class="hist-date">${date}</span>
      </div>
      <p class="hist-meta">${formatMinutes(w.finishedAt - w.startedAt)} · ${workoutSetCount(w)} set · ${fmt(workoutVolume(w))} kg</p>
      <p class="hist-ex">${w.entries.map(e => esc(names.get(e.exerciseId) ?? '?')).join(' · ')}</p>
    </a>`;
}

export const gecmis = {
  title: 'Geçmiş',
  async mount(el, param) {
    const [workouts, exercises] = await Promise.all([db.getAll('workouts'), db.getAll('exercises')]);
    if (el.dataset.view !== 'gecmis') return;

    const names = new Map(exercises.map(e => [e.id, e.name]));
    const now = new Date();
    const [y, m] = /^\d{4}-\d{2}$/.test(param ?? '') ? param.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
    const first = new Date(y, m - 1, 1);

    const inMonth = workouts
      .filter(w => w.finishedAt && monthKey(new Date(w.startedAt)) === monthKey(first))
      .sort((a, b) => b.startedAt - a.startedAt);
    const byDay = new Map();
    inMonth.forEach(w => {
      const k = dayKey(new Date(w.startedAt));
      byDay.set(k, [...(byDay.get(k) ?? []), w]);
    });

    let selected = null; // aynı gün birden fazla antrenman varsa listeyi o güne süzer

    const render = () => {
      const offset = (first.getDay() + 6) % 7; // pazartesiden başlayan hafta
      const daysInMonth = new Date(y, m, 0).getDate();
      const today = dayKey(now);
      const cells = [];
      for (let i = 0; i < offset; i++) cells.push('<span></span>');
      for (let d = 1; d <= daysInMonth; d++) {
        const k = `${y}-${pad(m)}-${pad(d)}`;
        const cls = ['cal-day', byDay.has(k) && 'has', k === today && 'today', k === selected && 'selected'].filter(Boolean).join(' ');
        cells.push(byDay.has(k)
          ? `<button class="${cls}" data-day="${k}" aria-label="${d} — antrenman var">${d}</button>`
          : `<span class="${cls}">${d}</span>`);
      }

      const prev = monthKey(new Date(y, m - 2, 1));
      const next = monthKey(new Date(y, m, 1));
      const isCurrent = monthKey(first) === monthKey(now);
      const list = selected ? byDay.get(selected) : inMonth;
      const sets = inMonth.reduce((n, w) => n + workoutSetCount(w), 0);
      const volume = inMonth.reduce((n, w) => n + workoutVolume(w), 0);

      el.innerHTML = `
        <section class="card cal">
          <div class="cal-head">
            <a class="cal-nav" href="#/gecmis/${prev}" aria-label="Önceki ay">‹</a>
            <h2>${first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</h2>
            ${isCurrent ? '<span class="cal-nav"></span>' : `<a class="cal-nav" href="#/gecmis/${next}" aria-label="Sonraki ay">›</a>`}
          </div>
          <div class="cal-grid">
            ${WEEKDAYS.map(d => `<span class="cal-dow">${d}</span>`).join('')}
            ${cells.join('')}
          </div>
          <p class="cal-sum">${inMonth.length ? `${inMonth.length} antrenman · ${sets} set · ${fmt(volume)} kg` : 'Bu ay kayıtlı antrenman yok'}</p>
        </section>
        ${selected ? `<button class="link-btn filter-clear" data-act="clear">${new Date(`${selected}T12:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · tümünü göster</button>` : ''}
        ${list.map(w => cardHtml(w, names)).join('')}`;
    };

    const onClick = e => {
      const day = e.target.closest('[data-day]');
      if (day) {
        const items = byDay.get(day.dataset.day);
        if (items.length === 1) { location.hash = `#/kayit/${items[0].id}`; return; }
        selected = selected === day.dataset.day ? null : day.dataset.day;
        render();
      } else if (e.target.closest('[data-act="clear"]')) {
        selected = null;
        render();
      }
    };

    render();
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  },
};

export const kayit = {
  title: 'Antrenman',
  tab: 'gecmis',
  async mount(el, id) {
    const [w, exercises] = await Promise.all([db.get('workouts', id), db.getAll('exercises')]);
    if (el.dataset.view !== 'kayit') return;
    if (!w?.finishedAt) { location.hash = '#/gecmis'; return; }

    const names = new Map(exercises.map(e => [e.id, e.name]));
    const start = new Date(w.startedAt);
    const back = `#/gecmis/${monthKey(start)}`;

    el.innerHTML = `
      <a class="back" href="${back}">‹ Geçmiş</a>
      <h2 class="rec-title">${esc(w.name)}</h2>
      <p class="workout-meta">${start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })} · ${start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
      <div class="stats">
        <div class="stat"><span class="stat-label">Süre</span><span class="stat-value">${formatMinutes(w.finishedAt - w.startedAt)}</span></div>
        <div class="stat"><span class="stat-label">Set</span><span class="stat-value">${workoutSetCount(w)}</span></div>
        <div class="stat"><span class="stat-label">Hacim</span><span class="stat-value">${fmt(workoutVolume(w))} kg</span></div>
      </div>
      ${w.entries.map(e => {
        const labels = setLabels(e.sets);
        const best = Math.max(...workSets(e.sets).map(s => s.weight), 0);
        return `
          <section class="card rec-card">
            <h3>${esc(names.get(e.exerciseId) ?? 'Silinmiş egzersiz')}</h3>
            ${e.sets.map((s, j) => `
              <div class="rec-row${s.warmup ? ' warm' : ''}">
                <span class="set-no">${labels[j]}</span>
                <span>${fmt(s.weight)} kg × ${s.reps}</span>
              </div>`).join('')}
            ${best ? `<p class="rec-best">En ağır: ${fmt(best)} kg</p>` : ''}
          </section>`;
      }).join('')}
      <div class="stack">
        <button class="btn btn-danger" data-act="delete">Antrenmanı sil</button>
      </div>`;

    el.querySelector('[data-act="delete"]').addEventListener('click', () => {
      actionSheet([{
        label: 'Evet, sil', danger: true,
        onClick: async () => {
          await db.del('workouts', w.id);
          toast('Antrenman silindi');
          location.hash = back;
        },
      }], 'Bu antrenman kalıcı olarak silinecek.');
    });
  },
};
