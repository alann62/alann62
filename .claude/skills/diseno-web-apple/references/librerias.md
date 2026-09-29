# Librerías del ecosistema: cuándo y cómo

La entrega preferida es un único HTML que anda sin internet. Eso define qué se usa directo y qué se recrea.

| Librería | Qué es | Cómo usarla acá |
|---|---|---|
| **Framer Motion / Motion** | Animaciones con resortes. `framer-motion` es para React; `motion` es la misma librería sin React | Usar `motion` (vanilla): copiar `node_modules/motion/dist/motion.js` a `js/` (~150 KB, global `window.Motion`). Ver `animaciones.md` |
| **GSAP + ScrollTrigger** | Animación atada al scroll | Copiar `gsap.min.js` y `ScrollTrigger.min.js` a `js/` |
| **Three.js** | 3D en el navegador (es lo que usa Spline por dentro) | Empaquetar con esbuild; ver `tres-d.md` y `assets/escena3d-base.js` |
| **Spline** | Editor visual de escenas 3D en la web | Las escenas se diseñan a mano en spline.design (cuenta del usuario). Si el usuario pasa el link `.splinecode`: `npm i @splinetool/runtime`, empaquetar con esbuild y `new Application(canvas).load(url)`. Ojo: la escena se descarga de Spline, así que no anda sin internet. Si no hay escena, hacerlo con Three.js |
| **Skiper UI, Magic UI, Aceternity UI** | Colecciones de componentes React + Tailwind para copiar y pegar | En páginas de un solo HTML, recrear el efecto en vanilla (texto palabra por palabra, luz que sigue al mouse, borde animado, marquee, tarjetas 3D, botón con destello, números animados: todos están en `animaciones.md`). Usarlos tal cual solo si el proyecto es React (ver abajo) |
| **UI UX Pro Max** | Skill con base de datos de estilos, paletas, tipografías, patrones de landing y UX | Consultar con su `search.py` al arrancar un rubro nuevo; no reemplaza el sistema visual de esta skill |

## Cuándo pasar a React

Si el proyecto es un sitio grande (muchas páginas, blog, panel con login, carrito real) conviene un proyecto React (Vite o Next.js) y ahí sí se usan `framer-motion`, Magic UI o Aceternity tal cual. Para una landing o una propuesta para mostrar, un solo HTML es más rápido de hacer, de mandar y de abrir.

Si igual hace falta React en una landing: Vite + `vite-plugin-singlefile` genera un único HTML con todo adentro.

## Instalar librerías o skills de terceros

Antes de instalar código de terceros (skills, CLIs, paquetes poco conocidos), revisalo: que no haga pedidos de red inesperados, no ejecute comandos, no lea credenciales ni archivos fuera del proyecto. Buscá `requests`, `urllib`, `socket`, `subprocess`, `os.system`, `eval`, `exec`, `base64`, `child_process`, `fetch(`. Instalá solo lo necesario (sin tests ni ejemplos) y contale al usuario qué revisaste.
