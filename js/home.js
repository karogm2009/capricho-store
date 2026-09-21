import { supabase } from './supabase.js'; import { loadHeader, $, escapeHtml, money } from './common.js';
await loadHeader();
const footer=document.querySelector('#site-footer'); if(footer) footer.innerHTML='<footer class="site-footer"><div class="container"><strong>CAPRICHO STORE</strong><p class="muted">¿Y por qué no?</p></div></footer>';
const grid=$('#featured'); const {data,error}=await supabase.from('products').select('id,name,slug,price,sale_price,image_url,stock,featured,active').eq('active',true).eq('featured',true).order('created_at',{ascending:false}).limit(8);
if(error){grid.innerHTML='<div class="empty"><h2>No pudimos cargar la selección.</h2><p class="muted">Revisa la configuración de Supabase.</p></div>';}
else if(!data?.length){grid.innerHTML='<div class="empty"><h2>Aún no hay productos destacados.</h2><p class="muted">Los caprichos aparecerán aquí cuando la administradora los configure.</p><a class="btn btn-outline" href="tienda.html">Ver tienda</a></div>';}
else grid.innerHTML=data.map(p=>`<a class="product-card" href="producto/detalle.html?slug=${encodeURIComponent(p.slug)}"><div class="media">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`:''}</div><div class="body"><h3>${escapeHtml(p.name)}</h3><span class="price ${p.sale_price?'sale':''}">${money(p.sale_price??p.price)}</span></div></a>`).join('');
