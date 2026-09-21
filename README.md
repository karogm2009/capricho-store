# CAPRICHO STORE

Tienda online modular en HTML5, CSS3 y JavaScript moderno, conectada a Supabase (PostgreSQL, Auth y Storage). El catálogo inicia vacío: no se incluyen productos, precios, fotos, stock, descuentos, WhatsApp ni métodos de pago ficticios.

## 1. Requisitos

- Visual Studio Code
- Navegador moderno
- Proyecto Supabase
- Git/GitHub

No requiere framework de front-end ni `node_modules`.

## 2. Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**.
3. Ejecuta `supabase/schema.sql` completo.
4. En Authentication crea el usuario administrador desde el panel de Supabase.
5. Copia el UUID de ese usuario y ejecuta:

```sql
insert into public.profiles(id, role)
values ('UUID-REAL-DEL-USUARIO', 'admin')
on conflict (id) do update set role='admin';
```

No reemplaces ese UUID por uno inventado.

## 3. Configuración del frontend

Copia:

`js/config.example.js` → `js/config.js`

Y completa:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

La publishable/anon key puede utilizarse en el navegador con RLS correctamente configurado. **Nunca** coloques la Service Role Key en este proyecto.

`js/config.js` está ignorado por Git mediante `.gitignore`.

## 4. Storage

El SQL crea el bucket público `product-images` y sus políticas. Las imágenes se guardan en Storage; PostgreSQL conserva sus referencias y metadatos.

## 5. Ejecución local

Como el proyecto usa módulos ES, abre la carpeta con un servidor local. En VS Code puedes usar una extensión de servidor local o cualquier servidor HTTP estático.

No abras los HTML mediante `file://`.

## 6. Arquitectura

- Público: inicio, tienda, categorías, detalle, carrito, checkout, nosotros y contacto.
- Administración: login, dashboard, productos, categorías, inventario, pedidos y configuración.
- Supabase: PostgreSQL + RLS + Auth + Storage.
- Carrito: `localStorage` solo como estado temporal del navegador; nunca se usa como autenticación.
- Pedido: la función PostgreSQL `create_order` vuelve a consultar precios, productos activos y stock y realiza el descuento de inventario de forma atómica.

## 7. Seguridad

- RLS activado en tablas sensibles.
- El panel exige Supabase Auth y `profiles.role = 'admin'`.
- La Service Role Key no se utiliza en frontend.
- Los precios del carrito no son fuente de verdad: el servidor PostgreSQL recalcula el pedido.
- El inventario no se descuenta al agregar al carrito.
- El stock se valida al crear el pedido.

## 8. Estructura

```text
CAPRICHO-STORE/
├── index.html
├── tienda.html
├── nosotros.html
├── contacto.html
├── carrito.html
├── checkout.html
├── tienda/
├── producto/
├── admin/
├── css/
├── js/
├── img/
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
└── README.md
```

## 9. GitHub

Antes de publicar revisa que `js/config.js` no esté incluido. Haz commit del código, SQL, README y archivos de configuración de ejemplo.

## 10. Despliegue

El frontend puede desplegarse como sitio estático. Configura el proyecto Supabase y asegúrate de que la URL del dominio final esté permitida en Supabase Auth si utilizas redirecciones de autenticación.

## 11. Datos comerciales

La aplicación deliberadamente no trae datos comerciales ficticios. La administradora debe configurar desde el panel los productos, imágenes, precios, stock, WhatsApp, domicilio, horarios y métodos de pago reales.
