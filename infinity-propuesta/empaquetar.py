"""Genera propuesta-infinity.html: la misma página con las imágenes incrustadas,
para compartirla como un único archivo."""
import base64, pathlib, re

base = pathlib.Path(__file__).parent
html = (base / "index.html").read_text(encoding="utf-8")
TIPOS = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg"}

def incrustar(m):
    ruta = base / m.group(0)
    datos = base64.b64encode(ruta.read_bytes()).decode()
    return f"data:{TIPOS[ruta.suffix]};base64,{datos}"

# Scripts locales: se copian adentro del HTML
def script(m):
    codigo = (base / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
    return "<script>" + codigo + "</script>"
html = re.sub(r'<script src="(js/[\w.-]+)"></script>', script, html)
html = re.sub(r"img/[\w-]+\.(?:webp|png|jpg)", incrustar, html)
# Rutas que el script arma en tiempo de ejecución ("img/p" + id + ".webp")
usadas = sorted(p.name for p in (base / "img").iterdir())
mapa = ",".join(f'"img/{n}":"data:{TIPOS[pathlib.Path(n).suffix]};base64,{base64.b64encode((base / "img" / n).read_bytes()).decode()}"' for n in usadas if n.startswith(("p", "c")))
html = html.replace('const P = (id, cat, nombre, precio, extra) => ({ id: String(id), cat, nombre, precio, img: "img/p" + id + ".webp", ...extra });',
                    'const IMGS = {' + mapa + '};\nconst P = (id, cat, nombre, precio, extra) => ({ id: String(id), cat, nombre, precio, img: IMGS["img/p" + id + ".webp"], ...extra });')
html = html.replace('h("img", { src: "img/c" + id + ".webp"', 'h("img", { src: IMGS["img/c" + id + ".webp"]')
(base / "propuesta-infinity.html").write_text(html, encoding="utf-8")
print(f"propuesta-infinity.html: {len(html) / 1e6:.1f} MB")
