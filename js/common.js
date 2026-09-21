import { supabase } from './supabase.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
export const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
export const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
export const getParam = key => new URLSearchParams(location.search).get(key);

export async function getSettings() {
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadHeader() {
  const header = $('#site-header');
  if (!header) return;
  header.innerHTML = `<header class="site-header"><a class="brand" href="index.html" aria-label="Capricho Store inicio">CAPRICHO STORE</a><button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">☰</button><nav id="main-nav" class="main-nav"><a href="index.html">Inicio</a><a href="tienda.html">Tienda</a><a href="tienda.html#categorias">Categorías</a><a href="nosotros.html">Nosotros</a><a href="contacto.html">Contacto</a><a class="cart-link" href="carrito.html">Mi capricho <span class="cart-count">0</span></a></nav></header>`;
  const btn = $('.menu-toggle', header), nav = $('#main-nav', header);
  btn?.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(open)); });
  updateCartCount();
}

export function getCart() { try { return JSON.parse(localStorage.getItem('capricho_cart') || '[]'); } catch { return []; } }
export function saveCart(cart) { localStorage.setItem('capricho_cart', JSON.stringify(cart)); updateCartCount(); }
export function updateCartCount() { $$('.cart-count').forEach(el => el.textContent = getCart().reduce((s, i) => s + Number(i.quantity || 0), 0)); }
export function addToCart(product, quantity = 1, variant = null) {
  const cart = getCart();
  const key = `${product.id}:${variant?.id || 'base'}`;
  const found = cart.find(i => i.key === key);
  if (found) found.quantity += quantity;
  else cart.push({ key, product_id: product.id, variant_id: variant?.id || null, name: product.name, price: Number(product.sale_price ?? product.price), image: product.image_url, quantity, stock: product.stock, variant_name: variant?.name || null });
  saveCart(cart);
}
export function showToast(message, type='info') { const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = message; document.body.appendChild(t); requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{t.classList.remove('show'); setTimeout(()=>t.remove(),250)}, 2600); }
