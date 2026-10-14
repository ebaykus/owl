// Sekme ekranları. Her ekranın bir başlığı ve ekranı çizen mount(el, param) fonksiyonu var.
// mount bir temizlik fonksiyonu döndürebilir; ekrandan çıkarken çağrılır.
// tab: alt menüde hangi sekmenin yanacağı (alt sayfalar için).
import { toast } from './ui.js';
import { antrenman } from './views/antrenman.js';
import { sablonlar, sablon } from './views/sablonlar.js';
import { gecmis, kayit } from './views/gecmis.js';
import { ilerleme } from './views/ilerleme.js';

const soon = () => toast('Bir sonraki adımlarda geliyor');

export const views = {
  antrenman,
  sablonlar,
  sablon,
  gecmis,
  kayit,
  ilerleme,

  ayarlar: {
    title: 'Ayarlar',
    mount(el) {
      el.innerHTML = `
        <p class="section-label">Antrenman</p>
        <div class="list">
          <a class="list-item" href="#/sablonlar">Şablonlar <span class="chev">›</span></a>
          <button class="list-item" data-action="exercises">Egzersizler <span class="chev">›</span></button>
        </div>
        <p class="section-label">Veri</p>
        <div class="list">
          <button class="list-item" data-action="export">Yedeği dışa aktar <span class="chev">›</span></button>
          <button class="list-item" data-action="import">Yedeği içe aktar <span class="chev">›</span></button>
        </div>
        <p class="version">Owl · sürüm 0.5</p>`;
      el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', soon));
    },
  },
};
