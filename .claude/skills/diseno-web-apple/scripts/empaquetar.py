#!/usr/bin/env python3
"""Genera un único HTML autocontenido a partir de una página con carpetas js/ e img/.

- Reemplaza cada <script src="js/…"></script> por el código del archivo.
- Reemplaza cada ruta img/<archivo>.(webp|png|jpg|jpeg|svg) por un data URI, esté en
  atributos, CSS (url(...)) o strings de JavaScript.
- Si el JS arma rutas en tiempo de ejecución (por ejemplo "img/p" + id + ".webp"),
  usá --mapa: agrega `const IMGS = {"img/…": "data:…"}` al principio del primer <script>
  sin src, para que el código pueda hacer IMGS[ruta] ?? ruta.

Uso:
  python3 empaquetar.py index.html salida.html [--mapa]
"""
import argparse
import base64
import pathlib
import re

TIPOS = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml"}


def data_uri(ruta: pathlib.Path) -> str:
    return f"data:{TIPOS[ruta.suffix.lower()]};base64,{base64.b64encode(ruta.read_bytes()).decode()}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("salida")
    ap.add_argument("--mapa", action="store_true", help="agregar el objeto IMGS con todas las imágenes de img/")
    a = ap.parse_args()

    entrada = pathlib.Path(a.entrada).resolve()
    base = entrada.parent
    html = entrada.read_text(encoding="utf-8")

    def script(m):
        codigo = (base / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return "<script>" + codigo + "</script>"

    html = re.sub(r'<script src="(js/[\w./-]+)"></script>', script, html)
    html = re.sub(r"img/[\w./-]+\.(?:webp|png|jpe?g|svg)", lambda m: data_uri(base / m.group(0)), html)

    if a.mapa:
        imgs = sorted(p for p in (base / "img").rglob("*") if p.suffix.lower() in TIPOS)
        mapa = ",".join(f'"img/{p.relative_to(base / "img").as_posix()}":"{data_uri(p)}"' for p in imgs)
        html = re.sub(r"<script>(?!\s*\(function|\s*!function)", "<script>\nconst IMGS = {" + mapa + "};\n", html, count=1)

    salida = pathlib.Path(a.salida)
    salida.write_text(html, encoding="utf-8")
    print(f"{salida}: {len(html) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
