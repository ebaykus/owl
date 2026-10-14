// Owl — ana dosya: sekmeler arası geçişi yönetir.
// Adresler: #/antrenman, #/ayarlar, #/sablon/<id> gibi.
import { views } from './views.js';
import { ensureSeedData } from './db.js';
import { VERSION } from './version.js';

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

// iPhone ana ekran uygulamasını arka planda günlerce açık tutabiliyor.
// Uygulama öne her geldiğinde yeni sürüm var mı bak; varsa yenile.
// (Devam eden antrenman her değişiklikte kaydedildiği için veri kaybolmaz.)
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  try {
    const text = await fetch(`js/version.js?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.text());
    const latest = text.match(/VERSION = '([^']+)'/)?.[1];
    if (latest && latest !== VERSION) {
      await navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {});
      location.reload();
    }
  } catch {
    // internet yoksa şimdilik eski sürümle devam
  }
});
