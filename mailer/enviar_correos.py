"""
Envía el correo comercial de Fynova (con el folleto en PDF adjunto) a la lista
de clientes de un Excel.

Uso:
    python enviar_correos.py --excel clientes_ejemplo.xlsx
    python enviar_correos.py --excel clientes_ejemplo.xlsx --dry-run
    python enviar_correos.py --excel clientes_ejemplo.xlsx --limite 5

El Excel debe tener al menos las columnas: nombre, email
(columna opcional: empresa).
"""
import argparse
import logging
import re
import smtplib
import ssl
import sys
import time
from email.message import EmailMessage
from pathlib import Path

import pandas as pd
from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent
PLANTILLA = BASE_DIR / "templates" / "email_template.html"
FOLLETO_PDF = BASE_DIR / "salida" / "folleto_fynova.pdf"
LOG_FILE = BASE_DIR / "logs" / "envios.log"

ASUNTO = "Fynova - Ingeniería y redes contra incendio para tu empresa"

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)


def cargar_configuracion():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        log.error("No se encontró el archivo .env. Copiá .env.example a .env y completá los datos.")
        sys.exit(1)

    config = dotenv_values(env_path)
    faltantes = [k for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD") if not config.get(k)]
    if faltantes:
        log.error("Faltan variables en .env: %s", ", ".join(faltantes))
        sys.exit(1)

    return config


def limpiar_texto(valor: str) -> str:
    # Evita inyección de cabeceras (\r\n) y espacios raros en nombre/empresa.
    return " ".join(str(valor).replace("\r", " ").replace("\n", " ").split())


def cargar_clientes(ruta_excel: Path) -> pd.DataFrame:
    if not ruta_excel.exists():
        log.error("No se encontró el archivo Excel: %s", ruta_excel)
        sys.exit(1)

    df = pd.read_excel(ruta_excel)
    df.columns = [c.strip().lower() for c in df.columns]

    if "email" not in df.columns or "nombre" not in df.columns:
        log.error("El Excel debe tener columnas 'nombre' y 'email' (encontradas: %s)", list(df.columns))
        sys.exit(1)

    df["nombre"] = df["nombre"].fillna("").map(limpiar_texto)
    df["email"] = df["email"].fillna("").map(limpiar_texto)

    validos = df["email"].map(lambda e: bool(EMAIL_REGEX.match(e)))
    invalidos = df[~validos]
    for _, fila in invalidos.iterrows():
        log.warning("Email inválido, se omite: %r (nombre=%r)", fila.get("email"), fila.get("nombre"))

    return df[validos].reset_index(drop=True)


def construir_mensaje(destinatario: dict, remitente: str, remitente_nombre: str) -> EmailMessage:
    html = PLANTILLA.read_text(encoding="utf-8")
    html = html.format(nombre=destinatario["nombre"] or "estimado/a cliente")

    msg = EmailMessage()
    msg["Subject"] = ASUNTO
    msg["From"] = f"{remitente_nombre} <{remitente}>"
    msg["To"] = destinatario["email"]
    msg.set_content("Este correo requiere un cliente compatible con HTML para visualizarse correctamente.")
    msg.add_alternative(html, subtype="html")

    if FOLLETO_PDF.exists():
        msg.add_attachment(
            FOLLETO_PDF.read_bytes(),
            maintype="application",
            subtype="pdf",
            filename="folleto_fynova.pdf",
        )
    else:
        log.warning("No se encontró el folleto PDF en %s; se enviará el correo sin adjunto.", FOLLETO_PDF)

    return msg


def crear_conexion_smtp(config: dict):
    contexto_tls = ssl.create_default_context()
    server = smtplib.SMTP(config["SMTP_HOST"], int(config["SMTP_PORT"]), timeout=30)
    server.starttls(context=contexto_tls)
    server.login(config["SMTP_USER"], config["SMTP_PASSWORD"])
    return server


def enviar_todos(clientes: pd.DataFrame, config: dict, dry_run: bool, limite: int | None):
    if limite is not None:
        clientes = clientes.head(limite)

    if clientes.empty:
        log.info("No hay destinatarios válidos para enviar.")
        return

    remitente = config["SMTP_USER"]
    remitente_nombre = config.get("REMITENTE_NOMBRE", "Fynova")
    correos_por_minuto = int(config.get("CORREOS_POR_MINUTO", 20))
    pausa = 60 / correos_por_minuto if correos_por_minuto > 0 else 0
    reconectar_cada = int(config.get("RECONECTAR_CADA", 15))

    enviados, fallidos = 0, 0

    if dry_run:
        for _, fila in clientes.iterrows():
            log.info("[DRY-RUN] Se enviaría a %s <%s>", fila["nombre"], fila["email"])
        log.info("Simulación finalizada: %d correos se habrían enviado.", len(clientes))
        return

    server = crear_conexion_smtp(config)
    try:
        for idx, (_, fila) in enumerate(clientes.iterrows()):
            destinatario = {"nombre": fila["nombre"], "email": fila["email"]}

            if idx > 0 and idx % reconectar_cada == 0:
                try:
                    server.quit()
                except Exception:
                    pass
                log.info("Reconectando al servidor SMTP...")
                server = crear_conexion_smtp(config)

            for intento in range(3):
                try:
                    msg = construir_mensaje(destinatario, remitente, remitente_nombre)
                    server.send_message(msg)
                    log.info("Enviado a %s <%s>", destinatario["nombre"], destinatario["email"])
                    enviados += 1
                    break
                except smtplib.SMTPServerDisconnected:
                    if intento < 2:
                        log.warning("Desconexión detectada, reconectando...")
                        time.sleep(2 ** intento)
                        server = crear_conexion_smtp(config)
                    else:
                        log.error("Error enviando a %s después de reintentos: conexión perdida", destinatario["email"])
                        fallidos += 1
                except Exception as exc:
                    log.error("Error enviando a %s (intento %d): %s", destinatario["email"], intento + 1, exc)
                    if intento == 2:
                        fallidos += 1
                    else:
                        time.sleep(2 ** intento)

            if pausa:
                time.sleep(pausa)
    finally:
        try:
            server.quit()
        except Exception:
            pass

    log.info("Finalizado. Enviados: %d, fallidos: %d", enviados, fallidos)


def main():
    parser = argparse.ArgumentParser(description="Envía el correo comercial de Fynova a partir de un Excel de clientes.")
    parser.add_argument("--excel", required=True, help="Ruta al archivo Excel con columnas nombre y email.")
    parser.add_argument("--dry-run", action="store_true", help="Muestra qué se enviaría sin enviar nada realmente.")
    parser.add_argument("--limite", type=int, default=None, help="Limita la cantidad de correos a enviar (útil para probar).")
    args = parser.parse_args()

    config = cargar_configuracion()
    clientes = cargar_clientes(Path(args.excel))
    log.info("Clientes válidos a procesar: %d", len(clientes))

    enviar_todos(clientes, config, dry_run=args.dry_run, limite=args.limite)


if __name__ == "__main__":
    main()
