---
name: diseno-web-apple
description: Diseño y construcción de landings y sitios de producto con estética Apple (tipografía de sistema, mucho aire, grises #f5f5f7, bento, navegación translúcida, secciones negras), fotos de producto reales, 3D interactivo con Three.js empaquetado sin CDN, animaciones de scroll con GSAP (texto palabra por palabra, contadores, secciones fijadas con scrub, despieces), microinteracciones y entrega en un único HTML que anda sin internet. Usar SIEMPRE que el usuario pida una web, landing, página de producto, catálogo, tienda o propuesta de rediseño que tenga que verse "premium", "estilo Apple", "moderna", "con 3D", "con animaciones", "tipo Spline / Skiper UI / Magic UI / Aceternity", o cuando quiera mostrarle a un cliente o proveedor cómo quedaría su sitio mejorado, aunque no diga "Apple". Aplica especialmente a productos físicos e industriales (tanques, equipos, piping, incendio, efluentes) de marcas como TanqueYa, Fynova, Hidraeco o proveedores como Infinity Rotomolding.
---

# Diseño web estilo Apple

Esta skill resume cómo construir páginas de producto que se sientan de nivel Apple: pocas ideas por pantalla, producto protagonista, tipografía grande y movimiento con propósito. Nació de un rediseño real (propuesta para un fabricante de tanques rotomoldeados) y de sus errores, así que cada regla tiene un porqué.

## Cuándo leer cada referencia

| Necesitás… | Leé |
|---|---|
| Colores, tipografía, navegación, bento, botones, secciones | `references/sistema-visual.md` |
| Animaciones de scroll, texto palabra por palabra, contadores, pin + scrub, microinteracciones | `references/animaciones.md` |
| Un objeto 3D (producto que gira, despiece con scroll, configurador a escala) | `references/tres-d.md` |
| Usar fotos reales de producto o logos de clientes | `references/fotos.md` |
| Arrancar una página nueva rápido | `assets/plantilla.html` |

## Flujo de trabajo

1. **Juntá el contenido real antes de diseñar.** Catálogo, medidas, precios, fotos, logos de clientes, distribuidores, medios de pago. Si el cliente tiene un sitio, sacá el contenido de ahí (con `curl` si el navegador del entorno no tiene salida). Una maqueta con contenido real convence; una con "lorem ipsum" no.
2. **Definí el recorrido de la página** como una presentación, una idea por sección (ver "Estructura tipo").
3. **Construí con la plantilla** (`assets/plantilla.html`): ya trae tokens, navegación doble, hero, bento, sección negra, tienda con pedido por WhatsApp y los ganchos de animación.
4. **Sumá 3D y animación donde explican algo** (un despiece que muestra cómo funciona una conexión, un configurador que muestra la escala), no como adorno.
5. **Empaquetá en un solo HTML** con `scripts/empaquetar.py`: librerías e imágenes adentro. Así anda en visores que bloquean CDN, sin internet y se puede mandar por WhatsApp o mail.
6. **Probá antes de entregar** con `scripts/probar_pagina.mjs` (escritorio y celular, sin internet, errores de consola, imágenes rotas, desborde horizontal) y mirá las capturas. Arreglá y recién ahí entregá.

## Estructura tipo de una landing de producto

1. Franja de aviso (solo si es una maqueta para un tercero; ver "Maquetas de otras marcas").
2. Navegación global translúcida + navegación local con el nombre de la línea y un botón verde "Pedir/Comprar".
3. **Hero**: eyebrow de color, titular de 3–4 palabras con punto final ("Hecho para durar."), una bajada, un botón principal + un enlace "›", y la foto de familia de productos grande.
4. **Cifras**: 3–4 números grandes con contador (años, unidades vendidas, países).
5. **Anatomía 3D con scroll** (opcional pero es lo que más impacta): el producto se arma/desarma mientras el usuario baja, con textos numerados que acompañan cada paso.
6. **Bento de líneas**: tarjetas blancas redondeadas sobre gris, cada una con título, bajada, rango y fotos reales.
7. **Sección negra de tecnología** (el diferencial de la marca) con diagrama o despiece.
8. **Buscador/configurador**: el cliente carga su necesidad (litros, medidas) y ve el producto exacto con foto, precio y el accesorio que lleva, más un 3D a escala real junto a una persona de 1,75 m.
9. **Comparador** en columnas.
10. **Banda de foto a sangre** con el uso real (una cervecería, una planta, una obra).
11. **Tienda** con filtros segmentados, búsqueda, "Ver todos" y pedido que se envía por WhatsApp.
12. Cómo comprar (3 pasos), logos de clientes en cinta, distribuidores con filtro, preguntas frecuentes, contacto.

No hace falta usar todo: una landing chica puede ser hero + bento + buscador + contacto.

## Reglas que más importan (y por qué)

- **Una idea por pantalla.** Titulares cortos con punto final, bajada de una o dos líneas. Apple vende con pocas palabras grandes; los párrafos largos se saltean.
- **El producto es el héroe.** Fotos grandes, fondo limpio, nada compitiendo. Las fotos con fondo blanco van sobre tarjetas blancas: el fondo se funde solo y no hace falta recortarlas (recortar tanques blancos sobre fondo blanco se come el cuerpo del tanque).
- **Tipografía de sistema** (`-apple-system, "SF Pro Display", Inter…`): en iPhone y Mac se ve la fuente de Apple sin cargar nada.
- **Grises con intención:** fondo `#f5f5f7`, texto `#1d1d1f`, secundario `#6e6e73`. Un solo color de acento (el de la marca) para botones y enlaces.
- **El movimiento explica.** Cada animación responde "¿qué entiende el cliente con esto?": el despiece muestra cómo se arma la conexión; la escala junto a la persona muestra el tamaño. Si no explica nada, que sea sutil o no esté.
- **Nada depende de un CDN en la entrega.** Three.js y GSAP van empaquetados. Un visor que bloquea scripts externos rompe el 3D sin avisar (nos pasó).
- **Siempre hay respaldo.** Si no hay WebGL, se ve una foto; si el usuario pidió "reducir movimiento", no hay pin ni animaciones; si falta GSAP, los bloques aparecen con IntersectionObserver.
- **Precios y productos reales conectados.** El buscador no dice "consultar" si el producto existe: muestra foto, precio y botón "Agregar". Eso es lo que convierte la maqueta en una herramienta de venta.

## Maquetas de otras marcas

Cuando la página es una propuesta para mostrarle a otra empresa cómo quedaría su sitio:

- Poné una franja arriba: "Propuesta de rediseño · Maqueta no oficial" con un desplegable "Ver qué mejora".
- Agregá `<meta name="robots" content="noindex, nofollow">`.
- Entregala como archivo, no la publiques en una URL pública: con el nombre, logo y precios reales puede confundirse con el sitio oficial.

## Scripts

- `scripts/procesar_fotos.py` — convierte fotos de producto a WebP livianas, genera recortes opcionales y pasa logos de clientes a gris con transparencia. `python3 procesar_fotos.py --help`.
- `scripts/empaquetar.py` — genera un único HTML con los `<script src="js/…">` y las `img/…` incrustados. `python3 empaquetar.py index.html salida.html`.
- `scripts/probar_pagina.mjs` — abre la página en Chromium sin internet (escritorio y celular), guarda capturas y reporta errores, imágenes rotas y desborde horizontal. `node probar_pagina.mjs ruta/pagina.html carpeta-capturas`.

## Entrega

Al terminar, contale al usuario qué tiene la página en términos de negocio (qué puede hacer el cliente, qué convence), cómo abrirla, qué quedó pendiente (por ejemplo, fotos en alta resolución) y ofrecé el siguiente paso comercial (el mensaje para mandar la propuesta, la publicación, las campañas).
