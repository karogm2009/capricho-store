import { supabase } from './supabase.js'; import { loadHeader, $, escapeHtml, money } from './common.js';
await loadHeader();
const grid=$('#product-grid'), search=$('#search'), category=$('#category'), price=$('#price'), sort=$('#sort'), availability=$('#availability');
let categories=[];
const {data:cats,error:catErr}=await supabase.from('categories').select('id,name,slug').eq('active',true).order('sort_order');
if(!catErr){categories=cats||[];category.insertAdjacentHTML('beforeend',categories.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join(''));}
const params=new URLSearchParams(location.search); if(params.get('categoria')){const c=categories.find(x=>x.slug===params.get('categoria'));if(c)category.value=c.id;}
async function render(){
 let q=supabase.from('products').select('id,name,slug,description,price,sale_price,image_url,stock,featured,offer,active,created_at,category_id').eq('active',true);
 if(search.value.trim()) q=q.ilike('name',`%${search.value.trim()}%`); if(category.value)q=q.eq('category_id',category.value); if(availability.value==='available')q=q.gt('stock',0); if(availability.value==='soldout')q=q.lte('stock',0);
 if(sort.value==='low')q=q.order('sale_price',{ascending:true,nullsFirst:false}); else if(sort.value==='high')q=q.order('sale_price',{ascending:false,nullsFirst:false}); else if(sort.value==='name')q=q.order('name'); else q=q.order('created_at',{ascending:false});
 const {data,error}=await q; if(error){grid.innerHTML='<div class="empty"><h2>Error al cargar la tienda.</h2><p class="muted">Verifica Supabase y las políticas RLS.</p></div>';return;}
 let products=data||[]; if(price.value){const [min,max]=price.value.split('-').map(Number);products=products.filter(p=>{const v=Number(p.sale_price??p.price);return v>=min&&v<=max;});}
 if(!products.length){grid.innerHTML='<div class="empty"><h2>Estamos preparando nuevos caprichos para ti.</h2><p class="muted">No hay productos que coincidan con estos filtros.</p></div>';return;}
 grid.innerHTML=products.map(p=>`<a class="product-card" href="producto/detalle.html?slug=${encodeURIComponent(p.slug)}">${p.offer?'<span class="tag">Oferta</span>':''}${p.featured?'<span class="tag" style="left:auto;right:10px">Destacado</span>':''}<div class="media">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`:''}</div><div class="body"><h3>${escapeHtml(p.name)}</h3><div><span class="price ${p.sale_price?'sale':''}">${money(p.sale_price??p.price)}</span>${p.sale_price?`<span class="old-price">${money(p.price)}</span>`:''}</div><small class="muted">${p.stock>0?'Disponible':'Agotado'}</small></div></a>`).join('');
}
[search,category,price,sort,availability].forEach(el=>el.addEventListener('input',render)); render();
