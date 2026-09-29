"""Genera una muestra SIN MARCA de la propuesta para publicar o usar como portfolio.

Saca todo lo que identifica a Infinity (nombre, logo, fotos con su logo, clientes,
distribuidores, teléfono, mail, cifras y precios reales) y lo reemplaza por
ilustraciones, el 3D y datos de ejemplo. Los botones de WhatsApp quedan desactivados.

Uso: python3 generar_muestra.py  ->  ../muestra-sin-marca/index.html
"""
import pathlib
import re

base = pathlib.Path(__file__).parent
s = (base / "index.html").read_text(encoding="utf-8")
MARCA = "Tu Marca"


def rep(a, b, n=1):
    global s
    assert a in s, "no encontrado: " + a[:70]
    s = s.replace(a, b, n)


def svg(simbolo, vb, estilo=""):
    return f'<svg viewBox="{vb}" aria-hidden="true" style="{estilo}"><use href="#{simbolo}"/></svg>'


VB = {"p-conico": "0 0 200 300", "p-plano": "0 0 200 300", "p-horizontal": "0 0 320 200", "p-bin": "0 0 260 260",
      "p-base": "0 0 200 220", "p-plana": "0 0 200 220", "p-tapa": "0 0 200 200"}

# ---------- Encabezado y aviso ----------
rep("<title>Infinity Rotomolding · Propuesta de rediseño</title>", "<title>Tanques Premium</title>")
rep('content="Maqueta de propuesta de rediseño del sitio de Infinity Rotomolding. No es el sitio oficial."',
    'content="Muestra de diseño de una landing de tanques rotomoldeados con 3D y animaciones. Datos de ejemplo."')
rep("<b>Propuesta de rediseño.</b> Maqueta no oficial preparada para Infinity Rotomolding con el contenido de su sitio actual.",
    "<b>Muestra de diseño.</b> Marca, precios y datos de ejemplo: no representa a ninguna empresa real. Los botones de WhatsApp están desactivados.")
rep('aria-label="Infinity Rotomolding, inicio"><img src="img/logo.png" alt="" width="26" height="20">Infinity</a>',
    f'aria-label="{MARCA}, inicio"><svg aria-hidden="true"><use href="#i-logo"/></svg>{MARCA}</a>')
s = s.replace(".logo img { width: 26px; height: auto; }", ".logo img, .logo svg { width: 22px; height: 22px; }")
# Barras fijas respetan el área segura del teléfono
s = s.replace(".nav-global { position: sticky; top: 0;", ".nav-global { position: sticky; top: env(safe-area-inset-top, 0px);")
s = s.replace(".nav-local { position: sticky; top: 48px;", ".nav-local { position: sticky; top: calc(48px + env(safe-area-inset-top, 0px));")

# ---------- Imágenes -> ilustraciones ----------
hero = s[s.index('  <img class="hero-foto"'):]
hero = hero[:hero.index(">") + 1]
rep(hero, '''  <svg class="hero-foto" id="hero-foto" viewBox="0 0 1100 440" role="img" aria-label="Línea de tanques: horizontal, cónico, fondo plano y contenedor BIN">
    <svg x="0" y="190" width="330" height="210" viewBox="0 0 320 200"><use href="#p-horizontal"/></svg>
    <svg x="760" y="170" width="260" height="260" viewBox="0 0 260 260"><use href="#p-bin"/></svg>
    <svg x="560" y="50" width="240" height="360" viewBox="0 0 200 300"><use href="#p-plano"/></svg>
    <svg x="300" y="0" width="290" height="435" viewBox="0 0 200 300"><use href="#p-conico"/></svg>
  </svg>''')
rep('<img class="respaldo" src="img/p532.webp" alt="" width="243" height="500">', svg("p-conico", VB["p-conico"]).replace("<svg ", '<svg class="respaldo" '))

FOTOS = {"p3828": "p-conico", "p3913": "p-conico", "p3926": "p-conico", "p532": "p-conico", "p562": "p-plano",
         "horizontales": "p-horizontal", "p240": "p-plano", "grande": "p-plano", "contenedores": "p-bin",
         "p3280": "p-tapa", "p3272": "p-tapa", "p414": "p-horizontal"}


def img_a_svg(m):
    tag = m.group(0)
    nombre = re.search(r'src="img/([\w-]+)\.\w+"', tag).group(1)
    sim = FOTOS[nombre]
    estilo = re.search(r'style="([^"]*)"', tag)
    return svg(sim, VB[sim], (estilo.group(1) if estilo else "") + ";width:auto;max-width:100%")


s = re.sub(r'<img (?![^>]*id="gigante-img")[^>]*src="img/[\w-]+\.webp"[^>]*>', img_a_svg, s)
rep(s[s.index('<img id="gigante-img"'):s.index(">", s.index('<img id="gigante-img"')) + 1],
    svg("p-plano", VB["p-plano"], "height:420px;width:auto").replace("<svg ", '<svg id="gigante-img" '))
rep('<section class="banda" style="background-image:url(img/planta.webp)">',
    '<section class="banda" style="background:radial-gradient(120% 90% at 70% 20%, #2b3a30 0%, #111 60%)">')

# ---------- Textos de la empresa ----------
rep('<b class="num" data-contar="20">20</b><span>años fabricando tanques y recipientes.</span>',
    '<b class="num" data-contar="15">15</b><span>años de experiencia (ejemplo).</span>')
rep('<b class="num" data-contar="50000" data-prefijo="+">+50.000</b><span>tanques vendidos.</span>',
    '<b class="num" data-contar="30000" data-prefijo="+">+30.000</b><span>tanques vendidos (ejemplo).</span>')
rep("<b>Único</b><span>fabricante con sistema CLAMP en Latinoamérica.</span>", "<b>100%</b><span>polietileno virgen grado alimenticio.</span>")
rep('<b class="num" data-contar="5">5</b><span>países ya usan nuestros productos.</span>',
    '<b class="num" data-contar="4">4</b><span>países (ejemplo).</span>')
s = re.sub(r"Somos los únicos que la fab[^<]*", "Viene de fábrica en toda la línea.", s)
s = s.replace("o lo retirás por Sarandí, Avellaneda.", "o lo retirás por nuestra planta.")
s = s.replace("También podés retirar por Sarandí, Avellaneda.", "También podés retirar por nuestra planta.")
s = s.replace("mailto:info@infinityrotomolding.com", "#contacto")
s = s.replace("+54 9 11 5463-9406", "+54 9 11 0000-0000 (ejemplo)")
s = s.replace("info@infinityrotomolding.com", "ventas@example.com")
s = s.replace("<b>Sarandí, Avellaneda</b>", "<b>Planta propia (ejemplo)</b>")
s = s.replace("Siempre hay un Infinity para cada necesidad.", "Tanques rotomoldeados para cada necesidad.")
s = s.replace("Tanques Infinity", "Tanques").replace("Tanque Infinity", "Tanque")

# Clientes: fuera (son marcas reales)
a, b = s.index("<!-- CLIENTES -->"), s.index("<!-- DISTRIBUIDORES -->")
s = s[:a] + s[b:]
s = re.sub(r"^const CLIENTES = .*$\n", "", s, flags=re.M)
s = re.sub(r"^\[\.\.\.CLIENTES, \.\.\.CLIENTES\].*$\n", "", s, flags=re.M)

# Distribuidores de ejemplo
a = s.index("const DISTRIBUIDORES = [")
b = s.index("];", a) + 2
s = s[:a] + '''const DISTRIBUIDORES = [
  { n: "Distribuidor Cuyo (ejemplo)", lugar: "Mendoza", pais: "Argentina" },
  { n: "Distribuidor Centro (ejemplo)", lugar: "Córdoba", pais: "Argentina" },
  { n: "Distribuidor Norte (ejemplo)", lugar: "Salta", pais: "Argentina" },
  { n: "Distribuidor Patagonia (ejemplo)", lugar: "Neuquén", pais: "Argentina" },
  { n: "Distribuidor Chile (ejemplo)", lugar: "Santiago", pais: "Chile" },
  { n: "Distribuidor Perú (ejemplo)", lugar: "Lima", pais: "Perú" }
];''' + s[b:]

# ---------- Precios de ejemplo (redondeados, no son los reales) ----------
def ejemplo(n):
    return max(1000, round(n * 1.12 / 1000) * 1000)


s = s.replace("// Catálogo y precios de la tienda actual de Infinity", "// Catálogo y precios DE EJEMPLO")
s = re.sub(r'(P\(\s*\d+,\s*"[^"]+",\s*"(?:[^"\\]|\\.)*",\s*)(\d+)', lambda m: m.group(1) + str(ejemplo(int(m.group(2)))), s)
for real in ["91.283", "3.377", "3.347.190", "4.656.960"]:
    s = s.replace("$ " + real, "$ " + f"{ejemplo(int(real.replace('.', ''))):,}".replace(",", "."))

# Fotos del catálogo -> ilustración según el tipo
rep('img: "img/p" + id + ".webp", ...extra });', '...extra });')
rep('const fotoRes = (src, alt) => h("div", { class: "res-foto" }, h("img", { src, alt, loading: "lazy" }));',
    '''const VB = ''' + repr(VB).replace("'", '"') + ''';
function simbolo(p) {
  if (!p || typeof p === "string") return p && p.includes("contenedores") ? "p-bin" : p && p.includes("horizontales") ? "p-horizontal" : "p-plano";
  if (p.horiz) return "p-horizontal";
  if (p.cat === "Bases") return /plana|plástica/i.test(p.nombre) ? "p-plana" : "p-base";
  if (p.cat === "Accesorios CLAMP") return "p-tapa";
  if (p.cat === "Bateas y cajones") return "p-bin";
  if (p.cat === "Recipientes" || p.plano || /Madurador/.test(p.nombre)) return "p-plano";
  return "p-conico";
}
const fotoRes = (p) => h("div", { class: "res-foto" }, figura(simbolo(p)));''')
s = s.replace("fotoRes(tanque.img, tanque.nombre)", "fotoRes(tanque)")
s = s.replace('fotoRes(enCatalogo ? t.img : "img/p240.webp", "Tanque de fondo plano")', "fotoRes(enCatalogo ? t : \"plano\")")
s = s.replace('fotoRes(prod ? prod.img : (estado.tipo === "bin" ? "img/contenedores.webp" : "img/horizontales.webp"), nombre)',
              'fotoRes(prod || (estado.tipo === "bin" ? "contenedores" : "horizontales"))')
rep('h("div", { class: "fig" }, h("img", { src: p.img, alt: p.nombre, loading: "lazy" })),', 'h("div", { class: "fig" }, figura(simbolo(p))),')
s = s.replace(".prod .fig img { max-height: 180px;", ".prod .fig svg { height: 170px; width: auto; }\n  .prod .fig img { max-height: 180px;")
s = s.replace(".res-foto img { max-height: 170px;", ".res-foto svg { height: 160px; width: auto; }\n  .res-foto img { max-height: 170px;")

# ---------- WhatsApp desactivado ----------
rep('const wa = msg => "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);', 'const wa = msg => "#contacto";   // muestra: sin WhatsApp real')
s = s.replace('const WHATSAPP = "5491154639406";', 'const WHATSAPP = "";')
s = s.replace(', target: "_blank", rel: "noopener"', "")
s = s.replace('env.target = "_blank"; env.rel = "noopener";', "")
s = s.replace('a.target = "_blank"; a.rel = "noopener";', "")
s = s.replace("Hola Infinity!", "Hola!")

# ---------- Formato artifact: sin doctype/html/head/body ----------
s = re.sub(r"<!doctype html>\s*<html[^>]*>\s*<head>\s*", "", s, flags=re.I)
s = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', "", s)
s = s.replace("</head>\n<body>\n", "").replace("</body>\n</html>\n", "").replace("</body>\n</html>", "")

# Scripts locales adentro
def script(m):
    return "<script>" + (base / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script") + "</script>"


s = re.sub(r'<script src="(js/[\w.-]+)"></script>', script, s)

restos = sorted(set(re.findall(r"img/[\w.-]+", s)))
assert not restos, restos
# La marca no debe aparecer en el contenido (el "Infinity" numérico de las librerías JS no cuenta)
sin_libs = re.sub(r"<script>(?:(?!</script>).)*</script>", lambda m: m.group(0) if len(m.group(0)) < 60000 else "", s, flags=re.S)
assert not re.search(r"(?<![-=(,.\w])Infinity(?![\w(])|infinityrotomolding", sin_libs), "quedó la marca"
destino = base.parent / "muestra-sin-marca" / "index.html"
destino.parent.mkdir(exist_ok=True)
destino.write_text(s, encoding="utf-8")
print(destino, f"{len(s) / 1e6:.2f} MB")
