// Ayarlar > Şablonlar: şablon listesi ve şablon düzenleme ekranı.
// Değişiklikler yazarken kendiliğinden kaydedilir.
import * as db from '../db.js';
import { pickExercise } from '../picker.js';
import { actionSheet, esc, uid, toast } from '../ui.js';

const byOrder = (a, b) => a.order - b.order;

export const sablonlar = {
  title: 'Şablonlar',
  tab: 'ayarlar',
  async mount(el) {
    const templates = (await db.getAll('templates')).sort(byOrder);
    if (el.dataset.view !== 'sablonlar') return;

    el.innerHTML = `
      <a class="back" href="#/ayarlar">‹ Ayarlar</a>
      <p class="section-label">Şablonlar bu sırayla döner: biri bitince sıradaki önerilir.</p>
      ${templates.length ? `<div class="list">${templates.map((t, i) => `
        <div class="list-item tpl-row">
          <a class="tpl-link" href="#/sablon/${esc(t.id)}">
            <span class="li-title">${esc(t.name)}</span>
            <span class="li-sub">${t.exercises.length} egzersiz</span>
          </a>
          <button class="icon-btn" data-move="${i}" aria-label="${esc(t.name)} sırasını değiştir">⇅</button>
        </div>`).join('')}</div>` : '<p class="hint">Henüz şablon yok.</p>'}
      <div class="stack" style="margin-top:16px">
        <button class="btn" data-act="new">+ Yeni şablon</button>
      </div>`;

    el.querySelector('[data-act="new"]').addEventListener('click', async () => {
      const t = { id: uid(), name: 'Yeni şablon', order: (templates.at(-1)?.order ?? -1) + 1, exercises: [] };
      await db.put('templates', t);
      location.hash = `#/sablon/${t.id}`;
    });

    // Sırayı değiştir: komşusuyla yer değiştirir
    el.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.move);
      const swap = async j => {
        [templates[i].order, templates[j].order] = [templates[j].order, templates[i].order];
        await Promise.all([db.put('templates', templates[i]), db.put('templates', templates[j])]);
        sablonlar.mount(el);
      };
      actionSheet([
        i > 0 && { label: 'Yukarı taşı', onClick: () => swap(i - 1) },
        i < templates.length - 1 && { label: 'Aşağı taşı', onClick: () => swap(i + 1) },
      ].filter(Boolean), templates[i].name);
    }));
  },
};

export const sablon = {
  title: 'Şablon',
  tab: 'ayarlar',
  async mount(el, id) {
    const [t, exercises] = await Promise.all([db.get('templates', id), db.getAll('exercises')]);
    if (el.dataset.view !== 'sablon') return;
    if (!t) { location.hash = '#/sablonlar'; return; }

    const exMap = new Map(exercises.map(e => [e.id, e]));
    let timer = null;
    const saveSoon = () => { clearTimeout(timer); timer = setTimeout(() => { timer = null; db.put('templates', t); }, 300); };
    const saveNow = () => { clearTimeout(timer); timer = null; return db.put('templates', t); };

    const render = () => {
      el.innerHTML = `
        <a class="back" href="#/sablonlar">‹ Şablonlar</a>
        <label class="field-label" for="tpl-name">Şablon adı</label>
        <input id="tpl-name" class="text-input" data-field="name" value="${esc(t.name)}" autocomplete="off">
        <p class="section-label">Egzersizler</p>
        ${t.exercises.map((e, i) => `
          <section class="card tpl-ex" data-i="${i}">
            <div class="ex-head">
              <h3>${esc(exMap.get(e.exerciseId)?.name ?? 'Silinmiş egzersiz')}</h3>
              <button class="icon-btn" data-act="menu" aria-label="Egzersiz seçenekleri">•••</button>
            </div>
            <div class="tpl-fields">
              <label>Isınma<input data-field="warmup" inputmode="numeric" pattern="[0-9]*" value="${e.warmup}" autocomplete="off"></label>
              <label>Set<input data-field="sets" inputmode="numeric" pattern="[0-9]*" value="${e.sets}" autocomplete="off"></label>
              <label>Tekrar<input data-field="reps" value="${esc(e.reps)}" placeholder="—" autocomplete="off"></label>
            </div>
          </section>`).join('') || '<p class="hint">Henüz egzersiz yok.</p>'}
        <div class="stack">
          <button class="btn" data-act="add">+ Egzersiz ekle</button>
          <button class="btn btn-danger" data-act="delete">Şablonu sil</button>
        </div>`;
    };

    const onInput = e => {
      const field = e.target.dataset.field;
      if (!field) return;
      const v = e.target.value;
      if (field === 'name') {
        t.name = v.trim() || 'Adsız şablon';
      } else {
        const ex = t.exercises[e.target.closest('[data-i]').dataset.i];
        if (field === 'reps') ex.reps = v.trim();
        else {
          const n = parseInt(v, 10);
          if (!Number.isFinite(n)) return;
          ex[field] = field === 'warmup' ? Math.min(Math.max(n, 0), 5) : Math.min(Math.max(n, 1), 10);
        }
      }
      saveSoon();
    };

    const onClick = e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const i = Number(btn.closest('[data-i]')?.dataset.i);
      const change = fn => () => { fn(); saveNow(); render(); };

      if (btn.dataset.act === 'add') {
        pickExercise(exMap, exId => change(() => t.exercises.push({ exerciseId: exId, warmup: 0, sets: 3, reps: '10' }))());
      } else if (btn.dataset.act === 'menu') {
        const list = t.exercises;
        actionSheet([
          i > 0 && { label: 'Yukarı taşı', onClick: change(() => list.splice(i - 1, 0, ...list.splice(i, 1))) },
          i < list.length - 1 && { label: 'Aşağı taşı', onClick: change(() => list.splice(i + 1, 0, ...list.splice(i, 1))) },
          { label: 'Başka egzersizle değiştir', onClick: () => pickExercise(exMap, exId => change(() => { list[i].exerciseId = exId; })(), 'Egzersizi değiştir') },
          { label: 'Şablondan kaldır', danger: true, onClick: change(() => list.splice(i, 1)) },
        ].filter(Boolean), exMap.get(list[i].exerciseId)?.name);
      } else if (btn.dataset.act === 'delete') {
        actionSheet([{
          label: 'Evet, sil', danger: true,
          onClick: async () => {
            clearTimeout(timer);
            timer = null;
            await db.del('templates', t.id);
            toast('Şablon silindi');
            location.hash = '#/sablonlar';
          },
        }], `“${t.name}” şablonu silinecek. Geçmiş antrenmanların silinmez.`);
      }
    };

    render();
    el.addEventListener('input', onInput);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('input', onInput);
      el.removeEventListener('click', onClick);
      if (timer) saveNow();
    };
  },
};
