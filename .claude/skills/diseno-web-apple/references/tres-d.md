# 3D con Three.js (sin Spline, sin CDN)

Spline necesita que alguien arme la escena en su editor web. Con Three.js se logra lo mismo desde código y queda dentro del archivo. Usá `assets/escena3d-base.js` como punto de partida (motor, materiales, tubo, etiquetas HTML).

## Empaquetado (obligatorio)

Los visores de vista previa suelen bloquear scripts de CDN y `importmap`: el 3D no aparece y no hay error visible. Por eso:

```bash
npm i three@0.160.0 esbuild
npx esbuild src/escena3d.js --bundle --minify --format=iife --target=es2019 --outfile=js/escena3d.js
```

En el HTML: `<script src="js/escena3d.js"></script>` al final del body, después de GSAP. `empaquetar.py` lo incrusta. Pesa ~500 KB minificado; está bien.

## Motor

- `WebGLRenderer({antialias:true, alpha:true})`, `pixelRatio` hasta 2 (1,5 en celular), `ACESFilmicToneMapping`, `SRGBColorSpace`, sombras `PCFSoftShadowMap`, `localClippingEnabled = true` si hay líquidos cortados con plano.
- Iluminación: `RoomEnvironment` por `PMREMGenerator` (reflejos realistas sin HDR externo) + hemisférica suave + direccional con sombra.
- Piso: `PlaneGeometry` con `ShadowMaterial({opacity:.14})`: solo se ve la sombra, el fondo es el de la página.
- `ResizeObserver` para el tamaño y `IntersectionObserver` para no renderizar fuera de pantalla.
- Para dejar lugar a textos, corré el encuadre con `camera.setViewOffset(w, h, -w*.2, 0, w, h)` (a la derecha en escritorio; hacia arriba en celular con `[0, h*.16]`).

## Materiales que funcionaron

- **Polietileno natural translúcido**: `MeshPhysicalMaterial({ color:0xf2f4f1, roughness:.38, transmission:.78, thickness:.25, ior:1.46, clearcoat:.5, side:DoubleSide })`. Con `transmission` el líquido de adentro se ve esmerilado, como en la realidad.
- **Líquido**: `MeshStandardMaterial` opaco (si es transparente no aparece a través de la transmisión). Cerveza `0xc46a05` con emisivo `0x7a3a00`; agua `0x7cc4e8`.
- **Acero inoxidable**: `MeshStandardMaterial({ color:0xd3d8dc, metalness:1, roughness:.26 })`.
- **Plástico de color** (tapas): `MeshPhysicalMaterial({ roughness:.32, clearcoat:.6 })`.

## Modelar productos en metros reales

- Cuerpos de revolución (tanques, botellas, silos) con `LatheGeometry` a partir de un perfil `[radio, altura]`.
- Calculá dimensiones desde la capacidad: cilindro `h = V / (π r²)`; cono `V = π r² h / 3`. Así un configurador puede mostrar cualquier medida.
- **Nivel de líquido**: regenerar un `LatheGeometry` interno (radio × .955) hasta la altura del nivel; para formas no revolucionadas (horizontal, cubo) usar la misma forma más chica con `material.clippingPlanes = [new Plane((0,-1,0), nivelY)]`.
- Piezas chicas (conexiones, válvulas) en grupos separados para poder moverlas en un despiece.
- Una **persona de referencia de 1,75 m** (cápsulas grises) al lado comunica la escala mejor que cualquier número.

## Etiquetas sobre el 3D

Elementos HTML `.punto` posicionados cada cuadro proyectando un `Vector3` con `v.project(camera)`. Ocultarlos si quedan detrás (producto escalar con la dirección de cámara) o del lado de atrás del objeto. Estilo: punto del color de acento con latido + chip blanco translúcido.

## Despiece con scroll (estilo página de AirPods)

- Sección con `.pin` de `100vh`; `ScrollTrigger.create({ trigger, start:"top top", end:"+=3200", pin:".pin", scrub:.5, onUpdate: s => estado(s.progress) })` creado dentro del script 3D.
- `estado(p)` define todo en función del progreso: giro del objeto, cámara (posición y objetivo por fotogramas clave interpolados con smoothstep), piezas que se separan y vuelven, nivel de llenado, qué texto está activo.
- Textos a la izquierda en escritorio, tarjeta translúcida abajo en celular; cambian con una clase `.activo` (opacidad + desplazamiento).
- Sin GSAP o con "reducir movimiento": sin pin, estado fijo lindo y textos apilados.

## Configurador conectado al buscador

El buscador emite `window.dispatchEvent(new CustomEvent("tanque", { detail }))` y guarda `window.ultimoTanque` (por si el 3D carga después). La escena guarda el último pedido y rehace el modelo una vez por cuadro (no en cada evento del slider). Al cambiar: escala de .9 a 1, llenado animado y cámara que reencuadra con `lerp` (.12 por cuadro) según el alto y ancho del modelo más la persona.

## Respaldo

Cada escena tiene una `<img class="respaldo">` del producto real; la escena agrega `.listo` al contenedor cuando arrancó y el CSS oculta la foto. Envolver cada escena en `try/catch`: si falla WebGL, queda la foto.
