import { loadHeader, getSettings, $ } from './common.js';
loadHeader();
const footer = document.querySelector('#site-footer'); if (footer) footer.innerHTML='<footer class="site-footer"><div class="container"><div class="footer-grid"><div><strong>CAPRICHO STORE</strong><p class="muted">¿Y por qué no?</p></div><div><strong>Explora</strong><p><a href="tienda.html">Tienda</a></p></div><div><strong>Contacto</strong><p id="footer-contact" class="muted">Cargando…</p></div></div></div></footer>';
getSettings().then(s=>{const el=$('#footer-contact');if(el&&s)el.textContent=[s.city,s.instagram].filter(Boolean).join(' · ')}).catch(()=>{});
