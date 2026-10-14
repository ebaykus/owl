// Antrenman sekmesi: antrenman başlatma, set girişi ve kaydetme.
// Devam eden antrenman her değişiklikte kaydedilir; uygulama kapansa da kaybolmaz.
import * as db from '../db.js';
import { toast, sheet, actionSheet, esc, fmt, parseNum, uid, formatDuration } from '../ui.js';

const GROUPS = ['Göğüs', 'Sırt', 'Bacak', 'Omuz', 'Kol', 'Karın', 'Diğer'];
const CHECK_ICON = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';

let state = null;   // { el, workout, exercises: Map, previous: Map }
let saveTimer = null;

export const antrenman = {
  title: 'Antrenman',
  async mount(el) {
    const [workouts, exercises] = await Promise.all([db.getAll('workouts'), db.getAll('exercises')]);
    if (el.dataset.view !== 'antrenman') return; // bu arada başka sekmeye geçildiyse

    state = {
      el,
      workout: workouts.find(w => !w.finishedAt) ?? null,
      exercises: new Map(exercises.map(e => [e.id, e])),
      previous: previousSets(workouts),
    };
    render();

    el.addEventListener('click', onClick);
    el.addEventListener('input', onInput);
    el.addEventListener('focusin', onFocus);
    const timer = setInterval(tick, 1000);

    return () => {
      clearInterval(timer);
      el.removeEventListener('click', onClick);
      el.removeEventListener('input', onInput);
      el.removeEventListener('focusin', onFocus);
      flushSave();
      state = null;
    };
  },
};

// Her egzersiz için en son bitirilen antrenmandaki setler ("geçen sefer")
function previousSets(workouts) {
  const map = new Map();
  workouts
    .filter(w => w.finishedAt)
    .sort((a, b) => b.startedAt - a.startedAt)
    .forEach(w => w.entries.forEach(e => { if (!map.has(e.exerciseId)) map.set(e.exerciseId, e.sets); }));
  return map;
}

// Boş bir set için önerilen değer: geçen seferki aynı set, yoksa bu egzersizdeki bir önceki set
function suggestion(entry, j) {
  const prev = state.previous.get(entry.exerciseId);
  if (prev?.[j]) return prev[j];
  if (j === 0) return { weight: null, reps: null };
  const before = entry.sets[j - 1], ph = suggestion(entry, j - 1);
  return { weight: before.weight ?? ph.weight, reps: before.reps ?? ph.reps };
}

const newSet = () => ({ weight: null, reps: null, done: false });

/* ---------- Kaydetme ---------- */

function saveSoon() {
  clearTimeout(saveTimer);
  const w = state.workout;
  saveTimer = setTimeout(() => { saveTimer = null; db.put('workouts', w); }, 300);
}
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  return db.put('workouts', state.workout);
}
function flushSave() {
  if (saveTimer) saveNow();
}

/* ---------- Ekranlar ---------- */

function render() {
  state.el.innerHTML = state.workout ? activeHtml() : startHtml();
}

function startHtml() {
  return `
    <div class="hero">
      <img src="icons/logo.png" alt="">
      <h2>Bugün ne çalışıyoruz?</h2>
      <p>Boş başla ya da bir şablon seç.</p>
    </div>
    <div class="stack">
      <button class="btn btn-primary" data-act="start">Boş antrenman başlat</button>
      <button class="btn" data-act="start-template">Şablondan başlat</button>
    </div>`;
}

function activeHtml() {
  const w = state.workout;
  const doneSets = w.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const date = new Date(w.startedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  return `
    <div class="workout-head">
      <div>
        <h2>${esc(w.name)}</h2>
        <p class="workout-meta">${date} · ${doneSets} set tamamlandı</p>
      </div>
      <span class="timer" id="timer">${formatDuration(Date.now() - w.startedAt)}</span>
    </div>
    ${w.entries.length ? w.entries.map(entryHtml).join('') : '<p class="hint">İlk egzersizini ekleyerek başla.</p>'}
    <div class="stack workout-actions">
      <button class="btn" data-act="add-exercise">+ Egzersiz ekle</button>
      <button class="btn btn-primary" data-act="finish">Antrenmanı bitir</button>
    </div>`;
}

function entryHtml(entry, i) {
  const ex = state.exercises.get(entry.exerciseId);
  const prev = state.previous.get(entry.exerciseId);
  return `
    <section class="card ex-card" data-entry="${i}">
      <div class="ex-head">
        <h3>${esc(ex?.name ?? 'Silinmiş egzersiz')}</h3>
        <button class="icon-btn" data-act="exercise-menu" aria-label="Egzersiz seçenekleri">•••</button>
      </div>
      ${prev ? `<p class="prev">Geçen sefer: ${prev.map(s => `${fmt(s.weight)}×${s.reps}`).join(' · ')}</p>` : ''}
      <div class="set-grid set-head"><span>Set</span><span>kg</span><span>Tekrar</span><span></span></div>
      ${entry.sets.map((s, j) => setHtml(entry, s, j)).join('')}
      <button class="add-set" data-act="add-set">+ Set ekle</button>
    </section>`;
}

function setHtml(entry, s, j) {
  const ph = suggestion(entry, j);
  return `
    <div class="set-grid set-row${s.done ? ' done' : ''}" data-set="${j}">
      <span class="set-no">${j + 1}</span>
      <input data-field="weight" inputmode="decimal" autocomplete="off" value="${fmt(s.weight)}" placeholder="${fmt(ph.weight)}" aria-label="Set ${j + 1} kilo">
      <input data-field="reps" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${s.reps ?? ''}" placeholder="${ph.reps ?? ''}" aria-label="Set ${j + 1} tekrar">
      <button class="check" data-act="toggle-set" aria-label="Seti tamamla">${CHECK_ICON}</button>
    </div>`;
}

function tick() {
  const t = document.getElementById('timer');
  if (t && state?.workout) t.textContent = formatDuration(Date.now() - state.workout.startedAt);
}

/* ---------- Olaylar ---------- */

function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const i = Number(btn.closest('[data-entry]')?.dataset.entry);
  switch (btn.dataset.act) {
    case 'start': return startWorkout();
    case 'start-template': return toast('Şablonlar bir sonraki adımda geliyor');
    case 'add-exercise': return pickExercise(addEntry);
    case 'add-set': return addSet(i);
    case 'toggle-set': return toggleSet(i, Number(btn.closest('[data-set]').dataset.set));
    case 'exercise-menu': return exerciseMenu(i);
    case 'finish': return finishMenu();
  }
}

function onInput(e) {
  const field = e.target.dataset.field;
  if (!field) return;
  const entry = state.workout.entries[e.target.closest('[data-entry]').dataset.entry];
  const set = entry.sets[e.target.closest('[data-set]').dataset.set];
  const n = parseNum(e.target.value);
  set[field] = field === 'reps' && n != null ? Math.round(n) : n;
  saveSoon();
}

// Kutucuğa dokununca içindeki sayı seçilsin, direkt üstüne yazılsın
function onFocus(e) {
  if (e.target.dataset.field) e.target.select();
}

/* ---------- İşlemler ---------- */

async function startWorkout() {
  state.workout = { id: uid(), name: 'Antrenman', startedAt: Date.now(), finishedAt: null, entries: [] };
  await saveNow();
  render();
  pickExercise(addEntry);
}

function addEntry(exerciseId) {
  state.workout.entries.push({ exerciseId, sets: [newSet()] });
  saveNow();
  render();
  state.el.querySelector('.ex-card:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function addSet(i) {
  state.workout.entries[i].sets.push(newSet());
  saveNow();
  render();
}

function toggleSet(i, j) {
  const entry = state.workout.entries[i];
  const set = entry.sets[j];
  if (set.done) {
    set.done = false;
  } else {
    // Boş bıraktıysan önerilen değeri (gri yazı) kullan
    const ph = suggestion(entry, j);
    const reps = set.reps ?? ph.reps;
    if (!reps) {
      toast('Tekrar sayısını gir');
      state.el.querySelector(`[data-entry="${i}"] [data-set="${j}"] [data-field="reps"]`)?.focus();
      return;
    }
    set.reps = reps;
    set.weight = set.weight ?? ph.weight ?? 0;
    set.done = true;
  }
  saveNow();
  render();
}

function exerciseMenu(i) {
  const entry = state.workout.entries[i];
  actionSheet([
    entry.sets.length > 1 && { label: 'Son seti sil', onClick: () => { entry.sets.pop(); saveNow(); render(); } },
    { label: 'Egzersizi kaldır', danger: true, onClick: () => { state.workout.entries.splice(i, 1); saveNow(); render(); } },
  ].filter(Boolean), state.exercises.get(entry.exerciseId)?.name);
}

function finishMenu() {
  actionSheet([
    { label: 'Bitir ve kaydet', primary: true, onClick: finishWorkout },
    {
      label: 'Antrenmanı sil', danger: true,
      onClick: () => actionSheet([{ label: 'Evet, sil', danger: true, onClick: discardWorkout }], 'Bu antrenman ve girdiğin setler silinecek.'),
    },
  ], 'Tamamlanmamış (✓ olmayan) setler kaydedilmez.');
}

async function finishWorkout() {
  const w = state.workout;
  const entries = w.entries
    .map(e => ({ exerciseId: e.exerciseId, sets: e.sets.filter(s => s.done) }))
    .filter(e => e.sets.length);
  if (!entries.length) return toast('Kaydetmek için en az bir seti tamamla');

  state.workout = { ...w, entries, finishedAt: Date.now() };
  await saveNow();
  if (!state) return;

  entries.forEach(e => state.previous.set(e.exerciseId, e.sets));
  const sets = entries.flatMap(e => e.sets);
  const volume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  state.workout = null;
  render();
  toast(`Kaydedildi · ${sets.length} set · ${fmt(volume)} kg hacim`);
}

async function discardWorkout() {
  clearTimeout(saveTimer);
  saveTimer = null;
  await db.del('workouts', state.workout.id);
  if (!state) return;
  state.workout = null;
  render();
  toast('Antrenman silindi');
}

/* ---------- Egzersiz seçici ---------- */

function pickExercise(onPick) {
  sheet(`
    <div class="sheet-head">
      <h2>Egzersiz ekle</h2>
      <button class="link-btn" data-close>Kapat</button>
    </div>
    <input class="search" type="search" placeholder="Egzersiz ara" autocomplete="off" enterkeyhint="search">
    <div class="picker-list"></div>`, {
    tall: true,
    onMount(panel, close) {
      const list = panel.querySelector('.picker-list');
      const search = panel.querySelector('.search');

      const draw = () => {
        const q = search.value.trim();
        const key = q.toLocaleLowerCase('tr');
        const all = [...state.exercises.values()];
        const matches = all.filter(e => e.name.toLocaleLowerCase('tr').includes(key));
        const exact = all.some(e => e.name.toLocaleLowerCase('tr') === key);

        let html = q && !exact ? `<button class="pick-item pick-new" data-new>+ “${esc(q)}” egzersizini ekle</button>` : '';
        for (const g of GROUPS) {
          const items = matches.filter(e => (e.group ?? 'Diğer') === g).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          if (!items.length) continue;
          html += `<p class="pick-group">${g}</p>` + items.map(e => `<button class="pick-item" data-id="${esc(e.id)}">${esc(e.name)}</button>`).join('');
        }
        list.innerHTML = html;
      };

      search.addEventListener('input', draw);
      list.addEventListener('click', async e => {
        const item = e.target.closest('.pick-item');
        if (!item) return;
        let id = item.dataset.id;
        if (item.hasAttribute('data-new')) {
          const ex = { id: uid(), name: search.value.trim(), group: 'Diğer', custom: true };
          await db.put('exercises', ex);
          state.exercises.set(ex.id, ex);
          id = ex.id;
        }
        close();
        onPick(id);
      });
      draw();
    },
  });
}
