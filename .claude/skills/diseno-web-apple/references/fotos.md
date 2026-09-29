# Fotos de producto y logos

## Conseguirlas

- Si el cliente tiene sitio o tienda, las fotos suelen estar accesibles. En tiendas Odoo: `/shop` lista productos y la imagen está en `/web/image/product.template/<id>/image_1024`; los nombres salen de `content="…"` en los enlaces `/shop/…-<id>` y los precios de `oe_currency_value`. En WordPress/WooCommerce, buscar `wp-content/uploads`.
- Buscar también PNG con transparencia (fotos de familia de productos, logos): son oro para el hero.
- Pedir permiso o usarlas solo para la propuesta al mismo dueño de las fotos.

## Tratarlas

- Convertir a WebP (calidad ~80), máximo 560 px para tarjetas y 1000–1800 px para hero y bandas. Una tienda de 60 productos queda en ~1,5 MB.
- **Fondo blanco → tarjeta blanca.** No recortes productos blancos sobre fondo blanco: el relleno por inundación se mete en el cuerpo del producto. Poné la foto tal cual sobre una tarjeta `#fff`; sobre gris `#f5f5f7` podés usar `mix-blend-mode: multiply`.
- Recortar solo piezas con color o contraste (válvulas, abrazaderas, tanques con fondo de color distinto). `scripts/procesar_fotos.py --recortar` lo hace y conviene mirar el resultado sobre fondo oscuro para detectar mordidas.
- **Logos de clientes**: recortar al contenido, pasar a gris uniforme y convertir el blanco del fondo en transparencia (alfa según qué tan oscuro es cada píxel respecto del fondo). Así quedan prolijos sobre cualquier gris y en la cinta animada.
- Fotos con collage (producto + detalles) funcionan en la tienda, no en el hero ni en el bento.
- Una foto con una persona al lado de un producto grande vale oro: usala en la sección de "gran volumen".

## Usarlas en la página

- `width`/`height` reales en cada `<img>` y `loading="lazy"` salvo el hero.
- Alturas distintas en una fila de productos (190 / 260 / 340 px) para mostrar la escala de la línea.
- Catálogo en JS con `img: "img/p<id>.webp"`; `empaquetar.py` convierte esas rutas en data URIs.
