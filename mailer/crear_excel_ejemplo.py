"""Genera clientes_ejemplo.xlsx con las columnas esperadas por enviar_correos.py."""
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent

datos = [
    {"nombre": "Juan Pérez", "email": "juan.perez@ejemplo.com", "empresa": "Constructora Ejemplo SA"},
    {"nombre": "María Gómez", "email": "maria.gomez@ejemplo.com", "empresa": "Industrias del Sur"},
]

df = pd.DataFrame(datos, columns=["nombre", "email", "empresa"])
salida = BASE_DIR / "clientes_ejemplo.xlsx"
df.to_excel(salida, index=False)
print(f"Archivo de ejemplo creado en: {salida}")
