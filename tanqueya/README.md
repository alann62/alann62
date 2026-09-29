# TanqueYa — landing page

Web de una sola página para TanqueYa (tanques de agua, cisternas, tanques industriales y biodigestores).
Todo está en `index.html` (HTML + CSS + JS, sin dependencias ni build). Para verla, abrí el archivo en el navegador.

## Qué editar

Todo se configura al principio del `<script>`, al final de `index.html`:

- `WHATSAPP`: número en formato internacional, sin `+` ni espacios (ej. `5491150193319`).
- `CATALOGO`: lista de productos (nombre, categoría, imagen y 3 datos). Las tarjetas y el desplegable del formulario se generan solos.

No se nombran las marcas de los proveedores: la estrategia es mantener una marca propia.

## Cómo funciona

- Todos los botones "Cotizar" y "WhatsApp" abren `wa.me` con un mensaje ya escrito según el producto.
- El formulario no envía datos a ningún servidor: arma el mensaje (nombre, localidad, uso, producto y comentario) y abre WhatsApp.
- Meta Pixel: pegá el código del píxel donde está el comentario en el `<head>`. La página ya dispara `Lead` al enviar el formulario y `Contact` en cada clic a WhatsApp.

## Publicación

Es un sitio estático: sirve Netlify, Vercel, GitHub Pages o el hosting donde registres `tanqueya.com.ar`.

## Pendiente

- Fotos reales de los productos (hoy son ilustraciones SVG).
- Logo definitivo.
- Zonas de entrega y medios de pago concretos en las preguntas frecuentes.
