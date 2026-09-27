# Sistema visual estilo Apple

## Tokens

```css
:root {
  --fondo: #ffffff;
  --gris-fondo: #f5f5f7;     /* secciones alternas y fondo del hero */
  --texto: #1d1d1f;
  --secundario: #6e6e73;
  --terciario: #86868b;
  --linea: #d2d2d7;
  --acento: #0f9d58;         /* color de la marca: botones y eyebrows */
  --acento-hover: #0b8a4c;
  --enlace: #0a7f45;
  --negro: #000000;          /* secciones de tecnología */
  --sf: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --curva: cubic-bezier(.25, .1, .25, 1);
}
body { font: 17px/1.47 var(--sf); letter-spacing: -.022em; color: var(--texto); background: var(--fondo); -webkit-font-smoothing: antialiased; }
```

- El acento cambia por marca; todo lo demás se mantiene. Con un acento verde, en las secciones negras usá una versión más clara (`#34d27b`) para que tenga contraste.
- Inter como respaldo en Google Fonts; en Apple se usa SF del sistema.

## Escala tipográfica

| Uso | Tamaño | Peso | Tracking |
|---|---|---|---|
| Titular hero | `clamp(48px, 9vw, 96px)` | 600 | -.03em |
| Titular de sección (`.h-sec`) | `clamp(40px, 6vw, 64px)` | 600 | -.015em |
| Bajada (`.sub`) | `clamp(19px, 2.2vw, 24px)` | 400, color secundario | .005em |
| Eyebrow | 17px | 600, color acento | -.01em |
| Cifra grande | `clamp(44px, 6vw, 64px)` | 600 | -.03em |
| Texto | 17px | 400 | -.022em |
| Navegación | 12px | 400 | — |

Titulares cortos, con punto final, `text-wrap: balance`. Nada de mayúsculas sostenidas.

## Espaciado

- Secciones: `padding-block: 100px` (80px en secciones chicas).
- Contenedor: `max-width: 1024px` para texto, `1260px` para grillas; `padding-inline: 22px` siempre.
- Separación entre tarjetas de bento: `12px`. Entre bloques de texto y contenido: `48–64px`.

## Navegación doble

- **Global**: `position: sticky; top: 0; height: 48px; background: rgba(250,250,252,.8); backdrop-filter: saturate(180%) blur(20px)`. Logo, enlaces de 12px, ícono de bolsa con contador.
- **Local**: `sticky; top: 48px; height: 52px`, blanco translúcido con línea inferior. Nombre de la línea a la izquierda (21px, 600) y a la derecha enlaces + botón pill chico.
- `scroll-margin-top: 100px` en las secciones para que los anclas no queden tapadas.

## Componentes

- **Pill**: `border-radius: 980px; padding: 11px 22px; font-size: 17px; background: var(--acento); color: #fff`. Versión chica `12px / 6px 13px`. Versión borde: fondo transparente con `box-shadow: inset 0 0 0 1px`.
- **Enlace "›"**: texto color enlace con `::after { content: " ›" }`. Siempre al lado del botón principal.
- **Bento**: grilla de 2 columnas (1 en celular), tarjetas `background:#fff; border-radius:28px; padding:44px 32px 0; min-height:520px; text-align:center`, la foto abajo con `margin-top:auto`. Tarjetas `.grande` ocupan las 2 columnas.
- **Control segmentado**: contenedor `#e8e8ed`, radio 10px, padding 3px; botón activo blanco con sombra suave. Para tipos de producto, filtros de tienda y países.
- **Tarjeta de producto**: blanca, radio 22px, foto de 180px de alto (`object-fit: contain`), categoría en gris 12px, nombre 17px/600, precio con `font-variant-numeric: tabular-nums` y botón pill chico.
- **Sección negra**: `background:#000; color:#f5f5f7`, bajada en `#a1a1a6`. Para la tecnología diferencial.
- **Banda de foto**: `min-height: 620px; background: center/cover`, degradé negro de abajo hacia arriba y texto blanco alineado a la izquierda abajo.
- **Cinta de logos**: fila `width:max-content` duplicada y animada con `translateX(-50%)` en 40s lineal, con máscara de degradé a los costados.
- **Panel de pedido**: lateral derecho, blanco translúcido con blur, velo detrás; los ítems con control de cantidad redondo; botón "Enviar pedido por WhatsApp" que arma el mensaje con productos y total.

## Celular

- La navegación global esconde los enlaces; queda logo + bolsa. La local deja solo el botón.
- Bento a una columna, comparador con `overflow-x: auto` propio.
- Probar a 390 px: la página nunca debe desplazarse de costado.
