"""Genera artifact/index.html a partir de fynova.html (el visor de artifacts agrega doctype, head y body)."""
import pathlib, re
base = pathlib.Path(__file__).parent
s = (base / "fynova.html").read_text(encoding="utf-8")
s = re.sub(r"<!doctype html>\s*<html[^>]*>\s*<head>\s*", "", s, flags=re.I)
s = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', "", s)
s = re.sub(r'<link rel="(?:icon|apple-touch-icon)"[^>]*>\s*', "", s)
s = s.replace("</head>\n<body>\n", "").replace("</body>\n</html>\n", "").replace("</body>\n</html>", "")
(base / "artifact").mkdir(exist_ok=True)
(base / "artifact" / "index.html").write_text(s, encoding="utf-8")
print("artifact/index.html", f"{len(s) / 1e6:.1f} MB")
