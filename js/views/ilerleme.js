// İlerleme sekmesi: egzersiz bazında grafik, rekorlar ve son antrenmanlar.
// Adres: #/ilerleme/<egzersiz id>. Isınma setleri hesaba katılmaz.
import * as db from '../db.js';
import { sheet, esc, fmt } from '../ui.js';
import { workSets } from '../workout-utils.js';

const METRICS = {
  weight: { label: 'En ağır', unit: 'kg' },
  e1rm: { label: 'Tahmini 1RM', unit: 'kg' },
  volume: { label: 'Hacim', unit: 'kg' },
};
let metric = 'weight'; // egzersiz değişse de seçili ölçü kalsın

const CHART = { line: '#C8414A', pr: '#9B5CD6', surface: '#141414', grid: '#232323', label: '#8A8288', text: '#D8D0D4' };
const shortDate = t => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

// Tahmini tek tekrar maksimumu (Epley formülü)
const e1rm = s => (s.reps <= 1 ? s.weight : s.weight * (1 + s.reps / 30));
// Daha ağır olan set daha iyi; kilo eşitse daha çok tekrar
const better = (a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a);
// En iyi setin yapıldığı antrenman (eşitlikte ilk ulaşılan)
const bestSession = ss => ss.reduce((best, s) => (better(best.top, s.top) === best.top ? best : s));

// Her egzersiz için antrenman antrenman özet (eskiden yeniye)
function buildSessions(workouts) {
  const map = new Map();
  workouts
    .filter(w => w.finishedAt)
    .sort((a, b) => a.startedAt - b.startedAt)
    .forEach(w => w.entries.forEach(e => {
      const sets = workSets(e.sets);
      if (!sets.length) return;
      const top = sets.reduce(better);
      const s = {
        date: w.startedAt,
        workoutId: w.id,
        sets,
        top,
        weight: top.weight,
        e1rm: Math.max(...sets.map(e1rm)),
        volume: sets.reduce((n, x) => n + x.weight * x.reps, 0),
      };
      map.set(e.exerciseId, [...(map.get(e.exerciseId) ?? []), s]);
    }));
  return map;
}

const setsText = sets => sets.map(s => `${fmt(s.weight)}×${s.reps}`).join(' · ');
const metricText = (s, m) => `${fmt(Math.round(s[m] * 10) / 10)} kg`;

// Eksen için yuvarlak aralıklar (örn. 60, 70, 80, 90)
function niceScale(min, max, count = 4) {
  if (min === max) { const pad = Math.max(2.5, Math.abs(min) * 0.1); min -= pad; max += pad; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= raw);
  const lo = Math.max(0, Math.floor(min / step) * step);
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

function chartSvg(sessions, m, W) {
  const H = 190, L = 40, R = 14, T = 24, B = 26;
  const ys = sessions.map(s => s[m]);
  const { lo, hi, ticks } = niceScale(Math.min(...ys), Math.max(...ys));
  const t0 = sessions[0].date, t1 = sessions.at(-1).date;
  const x = t => (t1 === t0 ? (L + W - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const pts = sessions.map(s => [x(s.date), y(s[m])]);
  const prIndex = ys.lastIndexOf(Math.max(...ys));

  const grid = ticks.map(v => `
    <line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${CHART.grid}" stroke-width="1"/>
    <text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${CHART.label}">${fmt(v)}</text>`).join('');
  const xLabels = sessions.length === 1
    ? `<text x="${pts[0][0]}" y="${H - 6}" text-anchor="middle" font-size="11" fill="${CHART.label}">${shortDate(t0)}</text>`
    : `<text x="${L}" y="${H - 6}" text-anchor="start" font-size="11" fill="${CHART.label}">${shortDate(t0)}</text>
       <text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="11" fill="${CHART.label}">${shortDate(t1)}</text>`;
  const [px, py] = pts[prIndex];

  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
         aria-label="${METRICS[m].label} grafiği, ${sessions.length} antrenman, en yüksek ${metricText(sessions[prIndex], m)}">
      ${grid}
      ${xLabels}
      <line class="xh" x1="0" x2="0" y1="${T - 6}" y2="${H - B}" stroke="${CHART.label}" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>
      ${pts.length > 1 ? `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${CHART.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
      ${pts.map(([cx, cy], i) => `<circle cx="${cx}" cy="${cy}" r="4" fill="${i === prIndex ? CHART.pr : CHART.line}" stroke="${CHART.surface}" stroke-width="2"/>`).join('')}
      <text x="${Math.min(Math.max(px, L + 16), W - R - 16)}" y="${py - 10}" text-anchor="middle" font-size="12" font-weight="600" fill="${CHART.text}">${fmt(Math.round(ys[prIndex] * 10) / 10)}</text>
      <circle class="hl" r="6" fill="none" stroke="${CHART.text}" stroke-width="2" visibility="hidden"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    </svg>`;
}

export const ilerleme = {
  title: 'İlerleme',
  async mount(el, param) {
    const [workouts, exercises] = await Promise.all([db.getAll('workouts'), db.getAll('exercises')]);
    if (el.dataset.view !== 'ilerleme') return;

    const names = new Map(exercises.map(e => [e.id, e.name]));
    const sessions = buildSessions(workouts);
    if (!sessions.size) {
      el.innerHTML = `
        <div class="empty">
          <svg viewBox="0 0 24 24"><path d="M4 19h16M4 15l4-6 4 2 4-5 4 4"/></svg>
          <h2>Grafikler için veri bekleniyor</h2>
          <p>Birkaç antrenman kaydettikten sonra gelişimini burada göreceksin.</p>
        </div>`;
      return;
    }

    // Seçili egzersiz: adresteki, yoksa en son yapılan
    const latest = [...sessions.entries()].sort((a, b) => b[1].at(-1).date - a[1].at(-1).date);
    const exId = sessions.has(param) ? param : latest[0][0];
    const list = sessions.get(exId);
    const pr = bestSession(list);
    const bestE1rm = Math.max(...list.map(s => s.e1rm));

    const records = [...sessions.entries()]
      .map(([id, ss]) => ({ id, s: bestSession(ss) }))
      .sort((a, b) => (names.get(a.id) ?? '').localeCompare(names.get(b.id) ?? '', 'tr'));

    el.innerHTML = `
      <button class="ex-select" data-act="choose">
        <span>${esc(names.get(exId) ?? 'Silinmiş egzersiz')}</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="stats">
        <div class="stat"><span class="stat-label">Rekor set</span><span class="stat-value pr">${fmt(pr.top.weight)}×${pr.top.reps}</span></div>
        <div class="stat"><span class="stat-label">Tahmini 1RM</span><span class="stat-value">${fmt(Math.round(bestE1rm * 10) / 10)} kg</span></div>
        <div class="stat"><span class="stat-label">Antrenman</span><span class="stat-value">${list.length}</span></div>
      </div>
      <div class="seg" role="group" aria-label="Grafik ölçüsü">
        ${Object.entries(METRICS).map(([k, v]) => `<button data-metric="${k}" class="${k === metric ? 'active' : ''}" aria-pressed="${k === metric}">${v.label}</button>`).join('')}
      </div>
      <section class="card chart-card">
        <p class="readout"></p>
        <div class="chart-box"></div>
        ${list.length === 1 ? '<p class="chart-note">Çizgi için bu egzersizi en az 2 kez kaydetmelisin.</p>' : ''}
      </section>
      <p class="section-label">Son antrenmanlar</p>
      <div class="list">
        ${list.slice(-8).reverse().map(s => `
          <a class="list-item" href="#/kayit/${esc(s.workoutId)}">
            <span class="li-stack"><span class="li-title">${shortDate(s.date)}</span><span class="li-sub">${setsText(s.sets)}</span></span>
            <span class="prog-val">${s === pr ? '<span class="pr-badge">PR</span>' : ''}${metricText(s, 'weight')}</span>
          </a>`).join('')}
      </div>
      <p class="section-label">Rekorlar</p>
      <div class="list">
        ${records.map(r => `
          <button class="list-item${r.id === exId ? ' current' : ''}" data-ex="${esc(r.id)}">
            <span class="li-stack"><span class="li-title">${esc(names.get(r.id) ?? 'Silinmiş egzersiz')}</span><span class="li-sub">${shortDate(r.s.date)}</span></span>
            <span class="prog-val">${fmt(r.s.top.weight)} kg × ${r.s.top.reps}</span>
          </button>`).join('')}
      </div>`;

    const readout = el.querySelector('.readout');
    const box = el.querySelector('.chart-box');

    const show = i => {
      const s = list[i];
      readout.innerHTML = `<b>${shortDate(s.date)}</b> · ${metricText(s, metric)} <span class="readout-sets">${setsText(s.sets)}</span>`;
    };

    const drawChart = () => {
      box.innerHTML = chartSvg(list, metric, Math.round(box.clientWidth) || 320);
      show(list.length - 1);
      const svg = box.querySelector('svg');
      const xh = svg.querySelector('.xh'), hl = svg.querySelector('.hl');
      const circles = [...svg.querySelectorAll('circle:not(.hl)')];

      // Parmakla grafiğin üstünde gezince en yakın antrenmanı göster
      const pick = e => {
        const r = svg.getBoundingClientRect();
        const px = (e.clientX - r.left) * (svg.viewBox.baseVal.width / r.width);
        let i = 0;
        circles.forEach((c, j) => { if (Math.abs(c.cx.baseVal.value - px) < Math.abs(circles[i].cx.baseVal.value - px)) i = j; });
        const c = circles[i];
        xh.setAttribute('x1', c.cx.baseVal.value); xh.setAttribute('x2', c.cx.baseVal.value);
        hl.setAttribute('cx', c.cx.baseVal.value); hl.setAttribute('cy', c.cy.baseVal.value);
        xh.setAttribute('visibility', 'visible'); hl.setAttribute('visibility', 'visible');
        show(i);
      };
      svg.addEventListener('pointerdown', pick);
      svg.addEventListener('pointermove', pick);
    };
    drawChart();

    el.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => {
      metric = b.dataset.metric;
      el.querySelectorAll('[data-metric]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
      drawChart();
    }));
    el.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { location.hash = `#/ilerleme/${b.dataset.ex}`; }));

    el.querySelector('[data-act="choose"]').addEventListener('click', () => {
      sheet(`
        <div class="sheet-head"><h2>Egzersiz seç</h2><button class="link-btn" data-close>Kapat</button></div>
        <div class="picker-list">
          ${latest.map(([id, ss]) => `<button class="pick-item pick-row" data-id="${esc(id)}"><span>${esc(names.get(id) ?? 'Silinmiş egzersiz')}</span><span class="li-sub">${ss.length} antrenman</span></button>`).join('')}
        </div>`, {
        tall: true,
        onMount(panel, close) {
          panel.addEventListener('click', e => {
            const item = e.target.closest('[data-id]');
            if (!item) return;
            close();
            location.hash = `#/ilerleme/${item.dataset.id}`;
          });
        },
      });
    });
  },
};
