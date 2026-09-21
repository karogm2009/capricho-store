```js
import { supabase } from './supabase.js';

import {
    loadHeader,
    $,
    getCart,
    saveCart,
    money,
    escapeHtml,
    getSettings
} from './common.js';

await loadHeader();

const cart = getCart();
const form = $('#checkout-form');
const summary = $('#checkout-summary');
const msg = $('#checkout-message');

// ==========================================
// WHATSAPP DE CAPRICHO STORE
// ==========================================

const WHATSAPP_RESPALDO = '573005441419';

// ==========================================
// VALIDAR CARRITO
// ==========================================

if (!cart.length) {
    location.href = 'carrito.html';
    throw new Error('empty cart');
}

// ==========================================
// CONFIGURACIÓN
// ==========================================

const settings = await getSettings().catch(() => null);

const delivery = $('#delivery');
const addressFields = $('#address-fields');

// ==========================================
// CONFIGURAR ENTREGA
// ==========================================

if (settings) {

    if (settings.delivery_enabled === false) {

        delivery.value = 'pickup';

        [
            ...delivery.options
        ]
        .find(option => option.value === 'delivery')
        ?.remove();
    }

    if (settings.city && $('#city')) {
        $('#city').value = settings.city;
    }
}

// ==========================================
// OBTENER PRODUCTOS ACTUALES
// ==========================================

const productIds = [
    ...new Set(
        cart.map(item => item.product_id)
    )
];

const {
    data: products,
    error: productsError
} = await supabase
    .from('products')
    .select(`
        id,
        name,
        price,
        sale_price,
        image_url,
        stock,
        active
    `)
    .in('id', productIds);

if (productsError) {

    console.error(productsError);

    msg.textContent =
        'No pudimos validar los productos del pedido.';

    throw productsError;
}

const productMap = new Map(
    (products || []).map(product => [
        product.id,
        product
    ])
);

// ==========================================
// RENDERIZAR RESUMEN
// ==========================================

function render() {

    let total = 0;

    const itemsHtml = cart.map(item => {

        const product = productMap.get(
            item.product_id
        );

        if (!product || !product.active) {

            return `
                <div class="order-item">
                    <span>
                        ${escapeHtml(item.name)}
                        × ${item.quantity}
                    </span>

                    <strong>
                        No disponible
                    </strong>
                </div>
            `;
        }

        const price = Number(
            product.sale_price ??
            product.price ??
            0
        );

        const quantity = Number(
            item.quantity || 1
        );

        const subtotal = price * quantity;

        total += subtotal;

        return `
            <div class="order-item">

                <span>
                    ${escapeHtml(product.name)}
                    × ${quantity}

                    ${
                        item.variant_name
                            ? `<small class="muted">
                                · ${escapeHtml(item.variant_name)}
                              </small>`
                            : ''
                    }
                </span>

                <strong>
                    ${money(subtotal)}
                </strong>

            </div>
        `;

    }).join('');

    summary.innerHTML = `

        <h2>Tu pedido</h2>

        <div class="order-items">
            ${itemsHtml}
        </div>

        <hr>

        <div class="summary-line">
            <span>Subtotal</span>
            <strong>
                ${money(total)}
            </strong>
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

                <strong>
                    ${money(total)}
                </strong>
            </div>

        </div>

        <p class="muted">
            El total definitivo será validado al
            confirmar el pedido.
        </p>
    `;
}

// ==========================================
// MOSTRAR / OCULTAR DIRECCIÓN
// ==========================================

function toggle() {

    addressFields.hidden =
        delivery.value !== 'delivery';
}

delivery.addEventListener(
    'change',
    toggle
);

toggle();
render();

// ==========================================
// ENVIAR FORMULARIO
// ==========================================

form.addEventListener(
    'submit',
    async event => {

        event.preventDefault();

        msg.textContent =
            'Validando inventario y creando pedido…';

        // ======================================
        // DATOS DEL FORMULARIO
        // ======================================

        const fd = new FormData(form);

        const customerName =
            String(fd.get('name') || '').trim();

        const customerPhone =
            String(fd.get('phone') || '').trim();

        const deliveryType =
            String(fd.get('delivery') || '');

        const address =
            String(fd.get('address') || '').trim();

        const neighborhood =
            String(fd.get('neighborhood') || '').trim();

        const city =
            String(fd.get('city') || '').trim();

        const notes =
            String(fd.get('notes') || '').trim();

        // ======================================
        // VALIDACIONES
        // ======================================

        if (!customerName) {

            msg.textContent =
                'Por favor escribe tu nombre.';

            return;
        }

        if (!customerPhone) {

            msg.textContent =
                'Por favor escribe tu número de teléfono.';

            return;
        }

        if (!deliveryType) {

            msg.textContent =
                'Selecciona el tipo de entrega.';

            return;
        }

        if (
            deliveryType === 'delivery' &&
            !address
        ) {

            msg.textContent =
                'Por favor escribe la dirección de entrega.';

            return;
        }

        // ======================================
        // ITEMS PARA SUPABASE
        // ======================================

        const items = cart.map(item => ({

            product_id:
                item.product_id,

            variant_id:
                item.variant_id || null,

            quantity:
                Number(item.quantity)
        }));

        // ======================================
        // PAYLOAD DEL PEDIDO
        // ======================================

        const payload = {

            customer_name:
                customerName,

            customer_phone:
                customerPhone,

            delivery_type:
                deliveryType,

            address:
                address || null,

            neighborhood:
                neighborhood || null,

            city:
                city || null,

            notes:
                notes || null,

            items
        };

        // ======================================
        // CREAR PEDIDO EN SUPABASE
        // ======================================

        const {
            data,
            error
        } = await supabase.rpc(
            'create_order',
            {
                p_order: payload
            }
        );

        if (error) {

            console.error(error);

            msg.textContent =
                error.message ||
                'No pudimos crear el pedido.';

            return;
        }

        // ======================================
        // ID DEL PEDIDO
        // ======================================

        const orderId =
            data?.order_id ||
            data;

        // ======================================
        // CONSTRUIR MENSAJE DE WHATSAPP
        // ======================================

        let totalWhatsapp = 0;

        let text = `
Hola 👋, quiero confirmar mi pedido en CAPRICHO STORE.

🧾 Pedido: ${orderId}

👤 Cliente: ${customerName}
📞 Teléfono: ${customerPhone}

🚚 Entrega: ${
    deliveryType === 'delivery'
        ? 'Domicilio'
        : 'Recogida'
}
`;

        if (deliveryType === 'delivery') {

            text += `
📍 Dirección: ${address || '—'}
🏘️ Barrio: ${neighborhood || '—'}
🏙️ Ciudad: ${city || '—'}
`;
        }

        text += `
🛍️ PRODUCTOS:
`;

        // ======================================
        // PRODUCTOS DEL PEDIDO
        // ======================================

        cart.forEach(item => {

            const product =
                productMap.get(
                    item.product_id
                );

            if (!product || !product.active) {
                return;
            }

            const price = Number(
                product.sale_price ??
                product.price ??
                0
            );

            const quantity =
                Number(item.quantity || 1);

            const subtotal =
                price * quantity;

            totalWhatsapp += subtotal;

            text += `
• ${product.name}
  Cantidad: ${quantity}
  Precio: ${money(price)}
  Subtotal: ${money(subtotal)}
`;

            if (item.variant_name) {

                text +=
                    `  Variante: ${item.variant_name}\n`;
            }
        });

        // ======================================
        // TOTAL
        // ======================================

        text += `
💵 TOTAL ESTIMADO: ${money(totalWhatsapp)}

📝 Notas: ${notes || '—'}

¿Me pueden confirmar disponibilidad y el valor del envío?
`;

        // ======================================
        // VACIAR CARRITO
        // ======================================

        saveCart([]);

        // ======================================
        // OBTENER WHATSAPP
        // ======================================

        let whatsapp =
            settings?.whatsapp ||
            WHATSAPP_RESPALDO;

        whatsapp = String(whatsapp)
            .replace(/\D/g, '');

        // ======================================
        // ABRIR WHATSAPP
        // ======================================

        if (whatsapp) {

            const whatsappUrl =
                `https://wa.me/${whatsapp}` +
                `?text=${encodeURIComponent(
                    text.trim()
                )}`;

            location.href = whatsappUrl;

        } else {

            msg.textContent =
                'Pedido creado correctamente, pero WhatsApp no está configurado.';
        }

    }
);
```
