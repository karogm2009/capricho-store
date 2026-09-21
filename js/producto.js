```js
import { supabase } from './supabase.js';
import {
    loadHeader,
    $,
    escapeHtml,
    money,
    addToCart,
    showToast
} from './common.js';

await loadHeader();

const root = $('#product-detail');
const slug = new URLSearchParams(location.search).get('slug');

// Número de WhatsApp de CAPRICHO STORE
const numeroWhatsapp = '573005441419';

if (!slug) {
    root.innerHTML = `
        <div class="empty">
            <h2>Producto no encontrado.</h2>
        </div>
    `;
    throw new Error('missing slug');
}

const {
    data: p,
    error
} = await supabase
    .from('products')
    .select(`
        *,
        categories(name),
        product_images(id,url,sort_order),
        product_variants(id,name,sku,price,stock,active)
    `)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

if (error || !p) {
    root.innerHTML = `
        <div class="empty">
            <h2>Este capricho no está disponible.</h2>
            <a class="btn" href="../tienda.html">Volver a la tienda</a>
        </div>
    `;
    throw new Error(error?.message || 'not found');
}

const imgs = (p.product_images || [])
    .sort((a, b) => a.sort_order - b.sort_order);

const main = p.image_url || imgs[0]?.url || '';

let qty = 1;
let variant = null;

root.innerHTML = `
    <div class="product-detail">

        <div>
            <div class="gallery-main">
                <img
                    id="main-img"
                    src="${escapeHtml(main)}"
                    alt="${escapeHtml(p.name)}"
                >
            </div>

            <div class="thumbs">
                ${
                    [
                        ...(main ? [{ url: main }] : []),
                        ...imgs
                    ]
                    .filter(
                        (x, i, a) =>
                            x.url &&
                            a.findIndex(y => y.url === x.url) === i
                    )
                    .map(
                        x => `
                            <button
                                type="button"
                                data-img="${escapeHtml(x.url)}"
                            >
                                <img
                                    src="${escapeHtml(x.url)}"
                                    alt="Vista de ${escapeHtml(p.name)}"
                                >
                            </button>
                        `
                    )
                    .join('')
                }
            </div>
        </div>

        <div>

            <p class="eyebrow">
                ${escapeHtml(p.categories?.name || 'Capricho')}
            </p>

            <h1>${escapeHtml(p.name)}</h1>

            <div>
                <span class="price ${p.sale_price ? 'sale' : ''}">
                    ${money(p.sale_price ?? p.price)}
                </span>

                ${
                    p.sale_price
                        ? `<span class="old-price">${money(p.price)}</span>`
                        : ''
                }
            </div>

            <p>
                ${escapeHtml(p.description || '')}
            </p>

            ${
                (p.product_variants || []).filter(v => v.active).length
                    ? `
                        <h3>Variantes</h3>

                        <div
                            class="variant-list"
                            id="variants"
                        >
                            ${
                                p.product_variants
                                    .filter(v => v.active)
                                    .map(
                                        v => `
                                            <button
                                                type="button"
                                                data-id="${v.id}"
                                            >
                                                ${escapeHtml(v.name)}
                                            </button>
                                        `
                                    )
                                    .join('')
                            }
                        </div>
                    `
                    : ''
            }

            <p class="muted" id="stock-text">
                ${
                    p.stock > 0
                        ? `${p.stock} disponibles`
                        : 'Agotado'
                }
            </p>

            <div class="purchase">

                <div class="quantity">
                    <button
                        id="minus"
                        type="button"
                    >
                        −
                    </button>

                    <span id="qty">1</span>

                    <button
                        id="plus"
                        type="button"
                    >
                        +
                    </button>
                </div>

                <button
                    id="add"
                    class="btn"
                    type="button"
                    ${p.stock <= 0 ? 'disabled' : ''}
                >
                    AGREGAR A MI CAPRICHO
                </button>

                <button
                    id="whatsapp-buy"
                    class="btn whatsapp-btn"
                    type="button"
                    ${p.stock <= 0 ? 'disabled' : ''}
                >
                    💚 COMPRAR POR WHATSAPP
                </button>

            </div>

        </div>

    </div>
`;

// ===============================
// GALERÍA
// ===============================

root.querySelectorAll('[data-img]').forEach(button => {
    button.onclick = () => {
        $('#main-img').src = button.dataset.img;
    };
});

// ===============================
// STOCK Y PRECIO
// ===============================

const getStock = () =>
    variant
        ? Number(variant.stock)
        : Number(p.stock);

const getPrice = () =>
    variant?.price ??
    p.sale_price ??
    p.price;

// ===============================
// CANTIDAD
// ===============================

$('#minus').onclick = () => {
    qty = Math.max(1, qty - 1);
    $('#qty').textContent = qty;
};

$('#plus').onclick = () => {
    const stock = getStock();

    if (stock <= 0) return;

    qty = Math.min(stock, qty + 1);
    $('#qty').textContent = qty;
};

// ===============================
// VARIANTES
// ===============================

root.querySelectorAll('#variants button').forEach(button => {

    button.onclick = () => {

        variant = (p.product_variants || [])
            .find(v => String(v.id) === button.dataset.id);

        root
            .querySelectorAll('#variants button')
            .forEach(x => x.classList.remove('active'));

        button.classList.add('active');

        qty = 1;
        $('#qty').textContent = qty;

        const stock = Number(variant.stock);

        $('#stock-text').textContent =
            stock > 0
                ? `${stock} disponibles`
                : 'Agotado';

        $('#add').disabled = stock <= 0;
        $('#whatsapp-buy').disabled = stock <= 0;
    };
});

// ===============================
// AGREGAR AL CARRITO
// ===============================

$('#add').onclick = () => {

    if (qty > getStock()) {
        return showToast(
            'No hay suficiente stock.',
            'error'
        );
    }

    addToCart(
        {
            ...p,
            price: getPrice(),
            sale_price: null,
            image_url: main,
            stock: getStock()
        },
        qty,
        variant
    );

    showToast(
        'Agregado a tu capricho.',
        'success'
    );
};

// ===============================
// COMPRAR DIRECTAMENTE POR WHATSAPP
// ===============================

$('#whatsapp-buy').onclick = () => {

    const stock = getStock();

    if (stock <= 0) {
        return showToast(
            'Este producto está agotado.',
            'error'
        );
    }

    if (qty > stock) {
        return showToast(
            'No hay suficiente stock.',
            'error'
        );
    }

    const precio = Number(getPrice());
    const total = precio * qty;

    const varianteTexto = variant
        ? `\n🎨 Variante: ${variant.name}`
        : '';

    const mensaje = `
Hola 👋, quiero comprar en CAPRICHO STORE:

🛍️ Producto: ${p.name}${varianteTexto}
📦 Cantidad: ${qty}
💰 Precio unitario: ${money(precio)}
💵 Total: ${money(total)}

¿Me pueden confirmar la disponibilidad?
`.trim();

    const url =
        `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');
};
```
