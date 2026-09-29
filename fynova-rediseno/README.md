# Fynova · rediseño web

Rediseño de fynova.com.ar con la skill `diseno-web-apple`: portada con video, calculadora de red contra incendio (NFPA 13, orientativa) y de efluentes, anatomía de una red contra incendio con imágenes reales que avanzan con el scroll (fotos de obra con zoom al equipo y el video del rociador cuadro por cuadro), divisiones con video, servicios, trabajos realizados y formulario conectado a `contacto.php`.

## Archivos

- `index.html` + `img/` + `js/` + `contacto.php` + favicons: **versión para subir al hosting** (misma estructura que el sitio actual). El formulario envía a `contacto.php` (sin cambios) y, si falla, ofrece mandar la consulta por WhatsApp.
- `fynova.html`: la misma página en un solo archivo (fotos, videos y librerías incluidas), para mostrar o mandar por WhatsApp. El formulario no envía mail desde este archivo: ofrece WhatsApp.
- `artifact/index.html`: versión para publicar como artifact (`python3 para_artifact.py`).
- `img/rociador/`: los 63 cuadros del video del rociador (se dibujan en un canvas según el scroll).
- `src/escena.js`: versión anterior de la anatomía en 3D (Three.js), ya no se usa en la página. Si la querés volver a usar:
  ```
  npm i three@0.160.0 esbuild
  npx esbuild src/escena.js --bundle --minify --format=iife --outfile=js/escena.js
  python3 ../.claude/skills/diseno-web-apple/scripts/empaquetar.py index.html fynova.html
  python3 para_artifact.py
  ```

## Subir al hosting

Reemplazá en el servidor `index.html` y subí las carpetas `img/` y `js/`. `contacto.php` y los favicons quedan iguales. Probá el formulario una vez publicado.

## Cálculos

Los valores de la calculadora son orientativos (NFPA 13, rociadores estándar: cobertura, densidad, área de diseño, caudal de mangueras y duración por tipo de riesgo, +15% por pérdidas). La página lo aclara y lleva el resultado al formulario para pedir la visita técnica.
