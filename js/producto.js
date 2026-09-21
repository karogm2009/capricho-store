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

const numeroWhatsapp = '573005441419';

if (!root) {
    throw new Error('No se encontró #product-detail en producto.html');
}

if (!slug) {
    root.innerHTML = `
        <div class="empty">
            <h2>Producto no encontrado.</h2>
        </div>
    `;
    throw new Error('missing slug');
}

const { data: p, error } = await supabase
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

if (error) {
    console.error('Error de Supabase:', error);

    root.innerHTML = `
        <div class="empty">
            <h2>No pudimos cargar este capricho.</h2>
            <p>${escapeHtml(error.message)}</p>
            <a class="btn" href="../tienda.html">
                Volver a la tienda
            </a>
        </div>
    `;

    throw error;
}

if (!p) {
    root.innerHTML = `
        <div class="empty">
            <h2>Este capricho no está disponible.</h2>
            <a class="btn" href="../tienda.html">
                Volver a la tienda
            </a>
        </div>
    `;

    throw new Error('Producto no encontrado');
}

const imgs = (p.product_images || [])
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const main = p.image_url || imgs[0]?.url || '';

let qty = 1;
let variant = null;

const variantesActivas = (p.product_variants || [])
    .filter(v => v.active);

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
                    .filter((x, i, a) =>
                        x.url &&
                        a.findIndex(y => y.url === x.url) === i
                    )
                    .map(x => `
                        <button
                            type="button"
                            data-img="${escapeHtml(x.url)}"
                        >
                            <img
                                src="${escapeHtml(x.url)}"
                                alt="Vista de ${escapeHtml(p.name)}"
                            >
                        </button>
                    `)
                    .join('')
                }

            </div>

        </div>

        <div>

            <p class="eyebrow">
                ${escapeHtml(p.categories?.name || 'Capricho')}
            </p>

            <h1>
                ${escapeHtml(p.name)}
            </h1>

            <div class="product-price">

                <span class="price ${p.sale_price ? 'sale' : ''}">
                    ${money(p.sale_price ?? p.price)}
                </span>

                ${
                    p.sale_price
                        ? `
                            <span class="old-price">
                                ${money(p.price)}
                            </span>
                        `
                        : ''
                }

            </div>

            <p>
                ${escapeHtml(p.description || '')}
            </p>

            ${
                variantesActivas.length
                    ? `
                        <h3>Variantes</h3>

                        <div
                            class="variant-list"
                            id="variants"
                        >

                            ${
                                variantesActivas
                                    .map(v => `
                                        <button
                                            type="button"
                                            data-id="${v.id}"
                                        >
                                            ${escapeHtml(v.name)}
                                        </button>
                                    `)
                                    .join('')
                            }

                        </div>
                    `
                    : ''
            }

            <p
                class="muted"
                id="stock-text"
            >
                ${
                    Number(p.stock) > 0
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

                    <span id="qty">
                        1
                    </span>

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
                    ${Number(p.stock) <= 0 ? 'disabled' : ''}
                >
                    AGREGAR A MI CAPRICHO
                </button>

                <button
                    id="whatsapp-buy"
                    class="btn whatsapp-btn"
                    type="button"
                    ${Number(p.stock) <= 0 ? 'disabled' : ''}
                >
                    💚 COMPRAR POR WHATSAPP
                </button>

            </div>

        </div>

    </div>
`;

// Galería
root.querySelectorAll('[data-img]').forEach(button => {

    button.addEventListener('click', () => {

        const img = $('#main-img');

        if (img) {
            img.src = button.dataset.img;
        }

    });

});


// Stock
function getStock() {

    if (variant) {
        return Number(variant.stock);
    }

    return Number(p.stock);
}


// Precio
function getPrice() {

    if (variant) {
        return Number(variant.price);
    }

    return Number(
        p.sale_price ?? p.price
    );
}


// Cantidad - botón menos
const minus = $('#minus');

if (minus) {

    minus.addEventListener('click', () => {

        qty = Math.max(1, qty - 1);

        const qtyElement = $('#qty');

        if (qtyElement) {
            qtyElement.textContent = qty;
        }

    });

}


// Cantidad - botón más
const plus = $('#plus');

if (plus) {

    plus.addEventListener('click', () => {

        const stock = getStock();

        if (stock <= 0) {
            return;
        }

        qty = Math.min(stock, qty + 1);

        const qtyElement = $('#qty');

        if (qtyElement) {
            qtyElement.textContent = qty;
        }

    });

}


// Variantes
root.querySelectorAll('#variants button')
    .forEach(button => {

        button.addEventListener('click', () => {

            variant = variantesActivas.find(
                v => String(v.id) === button.dataset.id
            );

            if (!variant) {
                return;
            }

            root
                .querySelectorAll('#variants button')
                .forEach(x => {
                    x.classList.remove('active');
                });

            button.classList.add('active');

            qty = 1;

            const qtyElement = $('#qty');

            if (qtyElement) {
                qtyElement.textContent = '1';
            }

            const stock = Number(variant.stock);

            const stockText = $('#stock-text');

            if (stockText) {
                stockText.textContent =
                    stock > 0
                        ? `${stock} disponibles`
                        : 'Agotado';
            }

            const addButton = $('#add');
            const whatsappButton = $('#whatsapp-buy');

            if (addButton) {
                addButton.disabled = stock <= 0;
            }

            if (whatsappButton) {
                whatsappButton.disabled = stock <= 0;
            }

        });

    });


// Agregar al carrito
const addButton = $('#add');

if (addButton) {

    addButton.addEventListener('click', () => {

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

        addToCart(
            {
                ...p,
                price: getPrice(),
                sale_price: null,
                image_url: main,
                stock: stock
            },
            qty,
            variant
        );

        showToast(
            'Agregado a tu capricho.',
            'success'
        );

    });

}


// Comprar por WhatsApp
const whatsappButton = $('#whatsapp-buy');

if (whatsappButton) {

    whatsappButton.addEventListener('click', () => {

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

        const precio = getPrice();
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

    });

}
