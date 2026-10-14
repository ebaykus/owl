// Alttan açılan egzersiz seçici. Antrenman ve şablon ekranları birlikte kullanır.
import * as db from './db.js';
import { sheet, esc, uid } from './ui.js';

const GROUPS = ['Göğüs', 'Sırt', 'Bacak', 'Omuz', 'Kol', 'Karın', 'Diğer'];

// exercises: Map(id -> egzersiz). Yeni eklenen egzersiz bu Map'e de yazılır.
export function pickExercise(exercises, onPick, title = 'Egzersiz ekle') {
  sheet(`
    <div class="sheet-head">
      <h2>${esc(title)}</h2>
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
        const all = [...exercises.values()];
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
          exercises.set(ex.id, ex);
          id = ex.id;
        }
        close();
        onPick(id);
      });
      draw();
    },
  });
}
