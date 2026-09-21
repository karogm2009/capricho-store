```js
import { supabase } from './supabase.js';

import {
    loadHeader,
    $,
    getCart,
    saveCart,
    money,
    escapeHtml,
    showToast
} from './common.js';

await loadHeader();

const root = $('#cart');

// WhatsApp de CAPRICHO STORE
const numeroWhatsapp = '573005441419';

async function refresh() {

    const cart = getCart();

    if (!cart.length) {
        root.innerHTML = `
            <div class="empty">
                <h2>Tu capricho está esperando.</h2>
                <p class="muted">
                    Todavía no has agregado productos.
                </p>
                <a class="btn" href="tienda.html">
                    Descubrir caprichos
                </a>
            </div>
        `;

        return;
    }

    const ids = [
        ...new Set(cart.map(i => i.product_id))
    ];

    const {
        data,
        error
    } = await supabase
        .from('products')
        .select(
            'id,name,price,sale_price,image_url,stock,active'
        )
        .in('id', ids);

    if (error) {

        root.innerHTML = `
            <div class="empty">
                <h2>No pudimos validar el carrito.</h2>
            </div>
        `;

        return;
    }

    const map = new Map(
        (data || []).map(p => [p.id, p])
    );

    let subtotal = 0;

    root.innerHTML = `
        <div class="cart-layout">

            <div
                class="cart-list"
                id="cart-list"
            ></div>

            <aside class="summary">

                <h2>Resumen</h2>

                <div class="summary-line">
                    <span>Subtotal</span>
                    <strong id="subtotal"></strong>
                </div>

                <div class="summary-line">
                    <span>Envío</span>
                    <strong>
                        Se calcula al finalizar
                    </strong>
                </div>

                <div class="summary-total">
                    <div class="summary-line">
                        <span>Total estimado</span>
                        <strong id="total"></strong>
                    </div>
                </div>

                <a
                    class="btn"
                    style="width:100%"
                    href="checkout.html"
                >
                    Ir al checkout
                </a>

                <button
                    id="whatsapp-cart"
                    class="btn whatsapp-btn"
                    type="button"
                    style="width:100%; margin-top:10px;"
                >
                    💚 PEDIR POR WHATSAPP
                </button>

            </aside>

        </div>
    `;

    const list = $('#cart-list');

    list.innerHTML = cart.map((item, i) => {

        const p = map.get(item.product_id);

        if (!p || !p.active) {

            return `
                <div class="cart-row">

                    <div>
                        <strong>
                            ${escapeHtml(item.name)}
                        </strong>

                        <p class="muted">
                            Ya no está disponible.
                        </p>
                    </div>

                    <button
                        class="btn btn-outline remove"
                        data-i="${i}"
                    >
                        Eliminar
                    </button>

                </div>
            `;
        }

        const price = Number(
            p.sale_price ?? p.price
        );

        const max = Number(p.stock);

        subtotal += price * item.quantity;

        return `
            <div class="cart-row">

                <img
                    src="${escapeHtml(p.image_url || '')}"
                    alt="${escapeHtml(p.name)}"
                >

                <div>

                    <strong>
                        ${escapeHtml(p.name)}
                    </strong>

                    <p class="muted">
                        ${money(price)}
                        ${
                            item.variant_name
                                ? ` · ${escapeHtml(item.variant_name)}`
                                : ''
                        }
                    </p>

                    <div class="cart-actions">

                        <button
                            class="btn btn-outline dec"
                            data-i="${i}"
                        >
                            −
                        </button>

                        <span>
                            ${item.quantity}
                        </span>

                        <button
                            class="btn btn-outline inc"
                            data-i="${i}"
                            ${item.quantity >= max ? 'disabled' : ''}
                        >
                            +
                        </button>

                    </div>

                </div>

                <div>

                    <strong>
                        ${money(price * item.quantity)}
                    </strong>

                    <br>

                    <button
                        class="btn btn-outline remove"
                        data-i="${i}"
                    >
                        Eliminar
                    </button>

                </div>

            </div>
        `;

    }).join('');

    $('#subtotal').textContent = money(subtotal);
    $('#total').textContent = money(subtotal);

    // ==========================
    // AUMENTAR CANTIDAD
    // ==========================

    list.querySelectorAll('.inc').forEach(button => {

        button.onclick = () => {

            const index = Number(button.dataset.i);

            cart[index].quantity++;

            saveCart(cart);

            refresh();
        };

    });

    // ==========================
    // DISMINUIR CANTIDAD
    // ==========================

    list.querySelectorAll('.dec').forEach(button => {

        button.onclick = () => {

            const index = Number(button.dataset.i);

            cart[index].quantity--;

            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }

            saveCart(cart);

            refresh();
        };

    });

    // ==========================
    // ELIMINAR
    // ==========================

    list.querySelectorAll('.remove').forEach(button => {

        button.onclick = () => {

            const index = Number(button.dataset.i);

            cart.splice(index, 1);

            saveCart(cart);

            refresh();
        };

    });

    // ==========================
    // WHATSAPP
    // ==========================

    $('#whatsapp-cart').onclick = () => {

        let mensaje = `
Hola 👋, quiero hacer un pedido en CAPRICHO STORE:

`;

        let totalWhatsapp = 0;

        cart.forEach(item => {

            const p = map.get(item.product_id);

            if (!p || !p.active) return;

            const price = Number(
                p.sale_price ?? p.price
            );

            const totalProducto =
                price * item.quantity;

            totalWhatsapp += totalProducto;

            mensaje += `
🛍️ ${p.name}
📦 Cantidad: ${item.quantity}
💰 Precio: ${money(price)}
💵 Subtotal: ${money(totalProducto)}
`;

            if (item.variant_name) {
                mensaje +=
                    `🎨 Variante: ${item.variant_name}\n`;
            }

        });

        mensaje += `
💵 TOTAL ESTIMADO: ${money(totalWhatsapp)}

¿Me pueden confirmar disponibilidad y el valor del envío?
`;

        const url =
            `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(
                mensaje.trim()
            )}`;

        window.open(url, '_blank');
    };
}

refresh();
```
