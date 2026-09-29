# Propuesta de rediseño — Infinity Rotomolding

Maqueta para presentarle a Infinity Rotomolding cómo podría quedar su sitio. **No es el sitio oficial** y no debe publicarse como tal: lleva una franja arriba que lo aclara, y un `noindex` para que no la indexen los buscadores.

- `index.html` + `img/`: versión de trabajo.
- `propuesta-infinity.html`: la misma página en **un solo archivo**, con las fotos incrustadas, para compartir por WhatsApp o mail. Se regenera con `python3 empaquetar.py` después de editar `index.html`.

Se abre en cualquier navegador, sin servidor y sin internet: Three.js, GSAP y Motion van incluidos (`js/`). Si el equipo no tiene WebGL, en lugar del 3D se ve la foto del fermentador.

Para cambiar la escena 3D, editá `src/escena3d.js` y empaquetala con esbuild:

```
npm i three@0.160.0 esbuild
npx esbuild src/escena3d.js --bundle --minify --format=iife --outfile=js/escena3d.js
python3 empaquetar.py
```

## Contenido

Todo el contenido y las imágenes salen del sitio actual de Infinity (infinityrotomolding.com): fotos de producto, logo, foto de familia de productos, logos de cervecerías clientes, catálogo de la tienda con precios, medidas, tecnología CLAMP, medios de pago, envíos y distribuidores.

## Mejoras que muestra

- Anatomía en 3D con scroll de cine: el fermentador gira, se levanta la tapa, se desarma la salida CLAMP, se llena y muestra la base.
- Configurador 3D en el buscador: el tanque elegido a escala real junto a una persona de 1,75 m.
- Micro-interacciones: la foto vuela al carrito, tarjetas que se inclinan, total animado.

- Buscador de tanque: el cliente ingresa los litros y ve el diámetro que le sirve y la base compatible, con precio.
- Tabla técnica completa y legible.
- Pedido armado en la página y enviado por WhatsApp, sin registrarse.
- Diagrama que explica la conexión CLAMP.
- Rubros (cervecería, agro, industria) y distribuidores filtrables por país.
- Liviana y pensada primero para celular.

## Para la versión final

- Fotos de producto en alta resolución y con fondo uniforme (las de la tienda son de 500 px).
- Conectar la tienda a Mercado Pago o a su sistema actual.
