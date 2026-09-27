# Animaciones y microinteracciones

Librería: GSAP 3 + ScrollTrigger, copiadas en `js/` (no CDN) y cargadas antes del script principal. Todo tiene que funcionar sin ellas.

```js
const REDUCIR = matchMedia("(prefers-reduced-motion: reduce)").matches;
const GSAP = !REDUCIR && window.gsap && window.ScrollTrigger;
if (GSAP) gsap.registerPlugin(ScrollTrigger);
```

Si `GSAP` es falso: agregar la clase `io` al `<html>` y revelar `.revelar` con IntersectionObserver (CSS: `.io .revelar {opacity:0; transform:translateY(28px)}` → `.visible`). Con "reducir movimiento" todo queda visible y quieto.

## Titulares palabra por palabra (estilo Skiper UI)

Envolver cada palabra en `<span class="palabra"><span>…</span></span>` respetando los `<br>` (recorrer nodos de texto; no usar innerHTML). CSS: `.palabra{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.06em;margin-bottom:-.06em}`.

```js
gsap.from(t.querySelectorAll(".palabra > span"), {
  yPercent: 110, opacity: 0, filter: "blur(10px)", duration: 1, ease: "power4.out", stagger: .07,
  scrollTrigger: enHero ? null : { trigger: t, start: "top 88%" }
});
```

No lo apliques a títulos que viven dentro de una sección fijada (pin) que controla otra cosa: el disparador se calcula antes del pin y el título nunca aparece.

## Contadores

El HTML trae el valor final (para que se lea sin JS). Al entrar en pantalla cuenta desde 0:

```js
gsap.to(o, { v: fin, duration: 2, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" },
  onStart: () => el.textContent = pre + "0",
  onUpdate: () => el.textContent = pre + Math.round(o.v).toLocaleString("es-AR") });
```

## Parallax y zoom con scrub

- Foto del hero: `gsap.fromTo("#hero-foto", {scale:1}, {scale:1.1, yPercent:4, scrollTrigger:{trigger:".hero", start:"top top", end:"bottom top", scrub:true}})`.
- Foto protagonista en sección negra: de `scale:.7, borderRadius:60` a `scale:1, borderRadius:28` mientras entra.
- Fotos del bento: `yPercent:14 → 0` con scrub, muy sutil.

## Despiece fijado (pin + scrub)

Para explicar cómo se arma algo (una conexión, un equipo):

```js
const tl = gsap.timeline({ scrollTrigger: { trigger: "#pieza", start: "center center", end: "+=700", scrub: .6, pin: true } });
tl.from("#accesorio", { x: 180 }, 0).from("#abrazadera", { y: -140, opacity: 0 }, .15)
  .from("#junta", { y: 120, opacity: 0 }, .05).from("#etiquetas", { opacity: 0, duration: .6 }, .7);
```

Separá el SVG en grupos `<g id>` por pieza. Para el despiece en 3D ver `tres-d.md` (misma idea, pero el `onUpdate` del ScrollTrigger mueve las piezas).

## Microinteracciones (estilo Magic UI)

- **Luz que sigue al mouse** en tarjetas: `::before` con `radial-gradient(480px circle at var(--mx) var(--my), rgba(acento,.10), transparent 60%)`, opacidad 0 → 1 en hover; un solo `pointermove` delegado en `document` actualiza `--mx/--my`. La tarjeta necesita `position:relative; isolation:isolate` y el `::before` `z-index:-1`.
- **Botón con destello**: `::after` con degradé blanco en diagonal que cruza con `@keyframes` cada 3,4 s.
- **Botón magnético**: `gsap.quickTo(b,"x")` y `"y"` siguiendo el puntero con factor .3–.4; vuelve a 0 al salir.
- **Borde animado** en la tarjeta recomendada: `@property --ang` + `conic-gradient(from var(--ang), …)` en `border-box`, girando en 4 s.
- **Tarjetas que se inclinan**: solo con `pointer: fine`; `perspective(900px) rotateX(±7deg) rotateY(±7deg) translateY(-3px)` según la posición del puntero; resetear al salir.
- **Vuelo al carrito**: clonar la foto del producto con `position:fixed` en su rectángulo y animarla con `Element.animate` en arco hasta la bolsa (escala .06), después rebote de la bolsa con curva `cubic-bezier(.3,1.6,.5,1)`.
- **Total animado**: interpolar el número en 600 ms con `requestAnimationFrame` y easing cúbico.

Todo esto se desactiva con "reducir movimiento".
