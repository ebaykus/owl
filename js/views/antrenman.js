// Antrenman sekmesi: antrenman başlatma, set girişi ve kaydetme.
// Devam eden antrenman her değişiklikte kaydedilir; uygulama kapansa da kaybolmaz.
import * as db from '../db.js';
import { pickExercise } from '../picker.js';
import { toast, actionSheet, esc, fmt, parseNum, uid, formatDuration } from '../ui.js';
import { workSets, workoutVolume } from '../workout-utils.js';

const CHECK_ICON = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';

// { el, workout, exercises: Map, templates: [], lastTemplateId, previous: Map }
let state = null;
let saveTimer = null;

export const antrenman = {
  title: 'Antrenman',
  async mount(el) {
    const [workouts, exercises, templates] = await Promise.all([db.getAll('workouts'), db.getAll('exercises'), db.getAll('templates')]);
    if (el.dataset.view !== 'antrenman') return; // bu arada başka sekmeye geçildiyse

    const finished = workouts.filter(w => w.finishedAt).sort((a, b) => b.startedAt - a.startedAt);
    state = {
      el,
      workout: workouts.find(w => !w.finishedAt) ?? null,
      exercises: new Map(exercises.map(e => [e.id, e])),
      templates: templates.sort((a, b) => a.order - b.order),
      lastTemplateId: finished.find(w => w.templateId)?.templateId ?? null,
      previous: previousSets(finished),
    };
    render();

    el.addEventListener('click', onClick);
    el.addEventListener('input', onInput);
    el.addEventListener('focusin', onFocus);
    document.addEventListener('visibilitychange', onHide);
    const timer = setInterval(tick, 1000);

    return () => {
      clearInterval(timer);
      el.removeEventListener('click', onClick);
      el.removeEventListener('input', onInput);
      el.removeEventListener('focusin', onFocus);
      document.removeEventListener('visibilitychange', onHide);
      flushSave();
      state = null;
    };
  },
};

// Her egzersiz için en son antrenmandaki setler ("geçen sefer"). finished: yeniden eskiye sıralı.
function previousSets(finished) {
  const map = new Map();
  finished.forEach(w => w.entries.forEach(e => { if (!map.has(e.exerciseId)) map.set(e.exerciseId, e.sets); }));
  return map;
}

// Program sırayla döner: en son yapılan şablondan sonraki
function nextTemplate() {
  const list = state.templates;
  if (!list.length) return null;
  const i = list.findIndex(t => t.id === state.lastTemplateId);
  return list[(i + 1) % list.length];
}

// Boş bir set için önerilen değer (gri yazı). Sırasıyla:
// geçen seferki aynı set → bu egzersizdeki bir önceki set → şablondaki hedef tekrar.
// Isınma setleri sadece ısınma setleriyle, çalışma setleri çalışma setleriyle eşleşir.
function suggestion(entry, j) {
  const set = entry.sets[j];
  const sameKind = s => !!s.warmup === !!set.warmup;
  const k = entry.sets.slice(0, j).filter(sameKind).length;
  const prev = state.previous.get(entry.exerciseId)?.filter(sameKind);
  if (prev?.[k]) return prev[k];

  const before = entry.sets.slice(0, j).findLastIndex(sameKind);
  if (before >= 0) {
    const b = entry.sets[before], ph = suggestion(entry, before);
    return { weight: b.weight ?? ph.weight, reps: b.reps ?? ph.reps };
  }
  const targetReps = set.warmup ? NaN : parseInt(entry.target?.reps, 10);
  return { weight: null, reps: Number.isFinite(targetReps) ? targetReps : null };
}

const newSet = (warmup = false) => (warmup ? { weight: null, reps: null, done: false, warmup: true } : { weight: null, reps: null, done: false });

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
// Uygulama arka plana atılınca bekleyen kaydı hemen yap (iPhone arka planda zamanlayıcıları durdurur)
function onHide() {
  if (document.visibilityState === 'hidden') flushSave();
}

/* ---------- Ekranlar ---------- */

function render() {
  state.el.innerHTML = state.workout ? activeHtml() : startHtml();
}

function startHtml() {
  const next = nextTemplate();
  const names = t => t.exercises.map(e => esc(state.exercises.get(e.exerciseId)?.name ?? '?')).join(' · ');
  return `
    <div class="hero${next ? ' hero-sm' : ''}">
      <img src="icons/logo.png" alt="">
      <h2>Bugün ne çalışıyoruz?</h2>
    </div>
    ${next ? `
      <section class="card next-card">
        <p class="next-label">Sıradaki</p>
        <h3>${esc(next.name)}</h3>
        <p class="next-list">${names(next)}</p>
        <button class="btn btn-primary" data-act="start-template" data-id="${esc(next.id)}">${esc(next.name)} başlat</button>
      </section>` : ''}
    <div class="stack">
      ${state.templates.length > 1 ? '<button class="btn" data-act="pick-template">Başka şablon seç</button>' : ''}
      <button class="btn ${next ? 'btn-ghost' : 'btn-primary'}" data-act="start">Boş antrenman başlat</button>
    </div>`;
}

function activeHtml() {
  const w = state.workout;
  const doneSets = w.entries.reduce((n, e) => n + workSets(e.sets).filter(s => s.done).length, 0);
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

function targetText(t) {
  if (!t) return '';
  const work = t.reps ? `${t.sets}×${esc(t.reps)}` : `${t.sets} set`;
  return t.warmup ? `${t.warmup} ısınma + ${work}` : work;
}

function entryHtml(entry, i) {
  const ex = state.exercises.get(entry.exerciseId);
  const prev = workSets(state.previous.get(entry.exerciseId) ?? []);
  return `
    <section class="card ex-card" data-entry="${i}">
      <div class="ex-head">
        <h3>${esc(ex?.name ?? 'Silinmiş egzersiz')}</h3>
        <button class="icon-btn" data-act="exercise-menu" aria-label="Egzersiz seçenekleri">•••</button>
      </div>
      ${entry.target ? `<p class="target">Hedef: ${targetText(entry.target)}</p>` : ''}
      ${prev.length ? `<p class="prev">Geçen sefer: ${prev.map(s => `${fmt(s.weight)}×${s.reps}`).join(' · ')}</p>` : ''}
      <div class="set-grid set-head"><span>Set</span><span>kg</span><span>Tekrar</span><span></span></div>
      ${entry.sets.map((s, j) => setHtml(entry, s, j)).join('')}
      <button class="add-set" data-act="add-set">+ Set ekle</button>
    </section>`;
}

function setHtml(entry, s, j) {
  const ph = suggestion(entry, j);
  const label = s.warmup ? 'Is' : workSets(entry.sets.slice(0, j + 1)).length;
  const name = s.warmup ? 'Isınma seti' : `Set ${label}`;
  return `
    <div class="set-grid set-row${s.warmup ? ' warm' : ''}${s.done ? ' done' : ''}" data-set="${j}">
      <span class="set-no">${label}</span>
      <input data-field="weight" inputmode="decimal" autocomplete="off" value="${fmt(s.weight)}" placeholder="${fmt(ph.weight)}" aria-label="${name} kilo">
      <input data-field="reps" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${s.reps ?? ''}" placeholder="${ph.reps ?? ''}" aria-label="${name} tekrar">
      <button class="check" data-act="toggle-set" aria-label="${name} tamamla">${CHECK_ICON}</button>
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
    case 'start-template': return startWorkout(state.templates.find(t => t.id === btn.dataset.id));
    case 'pick-template': return actionSheet(state.templates.map(t => ({ label: t.name, onClick: () => startWorkout(t) })), 'Şablon seç');
    case 'add-exercise': return pickExercise(state.exercises, addEntry);
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

// template verilirse onun egzersizleri ve set sayılarıyla başlar
async function startWorkout(template) {
  state.workout = {
    id: uid(),
    name: template?.name ?? 'Antrenman',
    templateId: template?.id ?? null,
    startedAt: Date.now(),
    finishedAt: null,
    entries: (template?.exercises ?? []).map(t => ({
      exerciseId: t.exerciseId,
      target: { warmup: t.warmup, sets: t.sets, reps: t.reps },
      sets: [...Array(t.warmup || 0)].map(() => newSet(true)).concat([...Array(t.sets || 1)].map(() => newSet())),
    })),
  };
  await saveNow();
  render();
  if (!template) pickExercise(state.exercises, addEntry);
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
  const warmups = entry.sets.filter(s => s.warmup).length;
  actionSheet([
    { label: 'Isınma seti ekle', onClick: () => { entry.sets.splice(warmups, 0, newSet(true)); saveNow(); render(); } },
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
    .map(e => ({ ...e, sets: e.sets.filter(s => s.done) }))
    .filter(e => e.sets.length);
  if (!entries.length) return toast('Kaydetmek için en az bir seti tamamla');

  state.workout = { ...w, entries, finishedAt: Date.now() };
  await saveNow();
  if (!state) return;

  entries.forEach(e => state.previous.set(e.exerciseId, e.sets));
  if (w.templateId) state.lastTemplateId = w.templateId;
  const setCount = entries.flatMap(e => workSets(e.sets)).length;
  const volume = workoutVolume({ entries });
  state.workout = null;
  render();
  toast(`Kaydedildi · ${setCount} set · ${fmt(volume)} kg hacim`);
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
