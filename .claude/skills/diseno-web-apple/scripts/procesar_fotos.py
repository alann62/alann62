#!/usr/bin/env python3
"""Prepara fotos de producto y logos de clientes para una landing estilo Apple.

Requiere: pip install opencv-python-headless numpy

Ejemplos:
  # Fotos de producto -> WebP de 560 px (para tarjetas blancas)
  python3 procesar_fotos.py productos origen/*.jpg --salida img --max 560 --prefijo p

  # Recorte de fondo blanco (solo piezas con color/contraste; revisar el resultado)
  python3 procesar_fotos.py productos origen/valvula.jpg --salida img --recortar --prefijo r

  # Logos de clientes -> gris con transparencia
  python3 procesar_fotos.py logos logos/*.jpg --salida img --prefijo c
"""
import argparse
import pathlib

import cv2
import numpy as np


def ajustar(im, maximo):
    h, w = im.shape[:2]
    s = min(1, maximo / max(h, w))
    return cv2.resize(im, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA) if s < 1 else im


def recortar_blanco(im, tol=18):
    """Quita el fondo casi blanco conectado a los bordes y deja un alfa suavizado.
    No sirve para productos blancos sobre fondo blanco: se come el cuerpo."""
    h, w = im.shape[:2]
    mascara = np.zeros((h + 2, w + 2), np.uint8)
    flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE
    bordes = [(x, y) for x in range(0, w, max(1, w // 40)) for y in (0, h - 1)] + \
             [(x, y) for y in range(0, h, max(1, h // 40)) for x in (0, w - 1)]
    for x, y in bordes:
        if mascara[y + 1, x + 1] == 0 and im[y, x].min() > 225:
            cv2.floodFill(im.copy(), mascara, (x, y), 0, (tol,) * 3, (tol,) * 3, flags)
    alfa = np.where(mascara[1:-1, 1:-1] > 0, 0, 255).astype(np.uint8)
    alfa = cv2.GaussianBlur(cv2.erode(alfa, np.ones((2, 2), np.uint8)), (3, 3), 0)
    out = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA)
    out[:, :, 3] = alfa
    ys, xs = np.where(alfa > 10)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def logo_transparente(im, maximo=260, gris=55):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY) if im.ndim == 3 else im
    fondo = float(np.median(np.concatenate([g[0], g[-1], g[:, 0], g[:, -1]])))
    ys, xs = np.where(g < fondo - 20)
    g = ajustar(g[ys.min():ys.max() + 1, xs.min():xs.max() + 1], maximo)
    alfa = np.clip((fondo - 12 - g.astype(float)) * 2.2, 0, 255).astype(np.uint8)
    return np.dstack([np.full_like(g, gris)] * 3 + [alfa])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("modo", choices=["productos", "logos"])
    ap.add_argument("archivos", nargs="+")
    ap.add_argument("--salida", default="img")
    ap.add_argument("--max", type=int, default=560, help="lado mayor en px")
    ap.add_argument("--prefijo", default="")
    ap.add_argument("--recortar", action="store_true", help="quitar fondo blanco (productos)")
    ap.add_argument("--calidad", type=int, default=80)
    a = ap.parse_args()

    salida = pathlib.Path(a.salida)
    salida.mkdir(parents=True, exist_ok=True)
    for f in a.archivos:
        im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
        if im is None:
            print("no se pudo leer", f)
            continue
        if im.ndim == 3 and im.shape[2] == 4 and a.modo == "productos":
            out = ajustar(im, a.max)                       # ya tiene transparencia
        elif a.modo == "logos":
            out = logo_transparente(im[:, :, :3] if im.ndim == 3 else im)
        else:
            im = im[:, :, :3] if im.ndim == 3 else cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
            out = ajustar(recortar_blanco(im) if a.recortar else im, a.max)
        destino = salida / f"{a.prefijo}{pathlib.Path(f).stem}.webp"
        cv2.imwrite(str(destino), out, [cv2.IMWRITE_WEBP_QUALITY, a.calidad])
        print(destino, out.shape[1], "x", out.shape[0])


if __name__ == "__main__":
    main()
