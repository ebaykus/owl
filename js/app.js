// Owl — ana dosya: sekmeler arası geçişi yönetir.
// Adresler: #/antrenman, #/ayarlar, #/sablon/<id> gibi.
import { views } from './views.js';
import { ensureSeedData } from './db.js';

const viewEl = document.getElementById('view');
const titleEl = document.getElementById('page-title');
const tabs = document.querySelectorAll('.tabbar a');
let cleanup = null;

async function render() {
  const [route, param] = location.hash.replace('#/', '').split('/');
  const name = views[route] ? route : 'antrenman';
  const view = views[name];

  cleanup?.();
  cleanup = null;
  titleEl.textContent = view.title;
  document.title = `${view.title} · Owl`;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === (view.tab ?? name)));
  viewEl.dataset.view = name;
  viewEl.innerHTML = '';
  window.scrollTo(0, 0);

  const result = await view.mount(viewEl, param && decodeURIComponent(param));
  if (viewEl.dataset.view === name) cleanup = result ?? null;
  else result?.();
}

await ensureSeedData();
window.addEventListener('hashchange', render);
render();

// iPhone'un verileri "yer açmak için" silmemesini iste
navigator.storage?.persist?.();

// İnternetsiz çalışma için service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
