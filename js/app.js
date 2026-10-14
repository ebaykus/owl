// Owl — ana dosya: sekmeler arası geçişi yönetir.
import { views } from './views.js';
import { seedIfEmpty } from './db.js';

const viewEl = document.getElementById('view');
const titleEl = document.getElementById('page-title');
const tabs = document.querySelectorAll('.tabbar a');
let cleanup = null;

async function render() {
  const name = views[location.hash.replace('#/', '')] ? location.hash.replace('#/', '') : 'antrenman';
  const view = views[name];

  cleanup?.();
  cleanup = null;
  titleEl.textContent = view.title;
  document.title = `${view.title} · Owl`;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  viewEl.dataset.view = name;
  viewEl.innerHTML = '';
  window.scrollTo(0, 0);

  const result = await view.mount(viewEl);
  if (viewEl.dataset.view === name) cleanup = result ?? null;
  else result?.();
}

await seedIfEmpty();
window.addEventListener('hashchange', render);
render();

// iPhone'un verileri "yer açmak için" silmemesini iste
navigator.storage?.persist?.();

// İnternetsiz çalışma için service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
