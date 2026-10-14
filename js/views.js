// Sekme ekranları. Her ekranın bir başlığı ve ekranı çizen mount(el, param) fonksiyonu var.
// mount bir temizlik fonksiyonu döndürebilir; ekrandan çıkarken çağrılır.
// tab: alt menüde hangi sekmenin yanacağı (alt sayfalar için).
import { toast } from './ui.js';
import { antrenman } from './views/antrenman.js';
import { sablonlar, sablon } from './views/sablonlar.js';

const soon = () => toast('Bir sonraki adımlarda geliyor');

export const views = {
  antrenman,
  sablonlar,
  sablon,

  gecmis: {
    title: 'Geçmiş',
    mount(el) {
      el.innerHTML = `
        <div class="empty">
          <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/></svg>
          <h2>Henüz antrenman yok</h2>
          <p>Bitirdiğin antrenmanlar burada takvimde görünecek.</p>
        </div>`;
    },
  },

  ilerleme: {
    title: 'İlerleme',
    mount(el) {
      el.innerHTML = `
        <div class="empty">
          <svg viewBox="0 0 24 24"><path d="M4 19h16M4 15l4-6 4 2 4-5 4 4"/></svg>
          <h2>Grafikler için veri bekleniyor</h2>
          <p>Birkaç antrenman kaydettikten sonra gelişimini burada göreceksin.</p>
        </div>`;
    },
  },

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
        <p class="version">Owl · sürüm 0.3</p>`;
      el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', soon));
    },
  },
};
