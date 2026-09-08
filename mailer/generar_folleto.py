"""
Genera el folleto comercial de Fynova en PDF (salida/folleto_fynova.pdf).

Editar el diccionario CONTENIDO para ajustar textos, productos y datos
de contacto sin tocar el resto del código.
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

BASE_DIR = Path(__file__).resolve().parent
SALIDA = BASE_DIR / "salida" / "folleto_fynova.pdf"

AZUL = colors.HexColor("#0B3D66")
NARANJA = colors.HexColor("#E65100")
GRIS = colors.HexColor("#4A4A4A")

CONTENIDO = {
    "titulo": "FYNOVA",
    "subtitulo": "Ingeniería y comercialización de sistemas de piping y redes contra incendio",
    "intro": (
        "En Fynova diseñamos, proveemos y ponemos en obra soluciones de piping "
        "industrial y sistemas de protección contra incendio, acompañando a "
        "nuestros clientes desde la ingeniería del proyecto hasta la puesta en "
        "marcha."
    ),
    "productos": [
        ("Redes contra incendio", "Diseño e instalación de redes húmedas y secas, rociadores, gabinetes e hidrantes según normativa vigente."),
        ("Piping industrial", "Provisión y montaje de cañerías para procesos industriales, con materiales certificados."),
        ("Ingeniería de proyecto", "Cálculo hidráulico, planos y documentación técnica para aprobación ante bomberos y organismos de control."),
        ("Mantenimiento", "Servicio preventivo y correctivo de sistemas contra incendio ya instalados."),
    ],
    "cierre": (
        "Si tu empresa necesita actualizar o instalar su red contra incendio, "
        "o requiere piping para un nuevo proyecto industrial, escribinos: "
        "te acompañamos en cada etapa."
    ),
    "web": "www.fynova.com.ar",
    "email": "comercial@fynova.com.ar",
    "redes": "Seguinos en nuestras redes sociales para novedades, obras realizadas y consejos de mantenimiento.",
}


def construir_pdf():
    SALIDA.parent.mkdir(exist_ok=True)

    doc = SimpleDocTemplate(
        str(SALIDA),
        pagesize=A4,
        topMargin=25 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title="Folleto Fynova",
    )

    estilo_titulo = ParagraphStyle(
        "Titulo", fontName="Helvetica-Bold", fontSize=28, textColor=AZUL, spaceAfter=4,
    )
    estilo_subtitulo = ParagraphStyle(
        "Subtitulo", fontName="Helvetica", fontSize=13, textColor=GRIS, spaceAfter=16,
        leading=16,
    )
    estilo_parrafo = ParagraphStyle(
        "Parrafo", fontName="Helvetica", fontSize=11, textColor=GRIS, leading=15,
        spaceAfter=10,
    )
    estilo_producto_titulo = ParagraphStyle(
        "ProductoTitulo", fontName="Helvetica-Bold", fontSize=12, textColor=NARANJA,
    )
    estilo_producto_desc = ParagraphStyle(
        "ProductoDesc", fontName="Helvetica", fontSize=10.5, textColor=GRIS, leading=14,
    )
    estilo_contacto = ParagraphStyle(
        "Contacto", fontName="Helvetica-Bold", fontSize=11, textColor=AZUL, leading=16,
    )

    elementos = []
    elementos.append(Paragraph(CONTENIDO["titulo"], estilo_titulo))
    elementos.append(Paragraph(CONTENIDO["subtitulo"], estilo_subtitulo))
    elementos.append(HRFlowable(width="100%", color=NARANJA, thickness=1.5, spaceAfter=14))
    elementos.append(Paragraph(CONTENIDO["intro"], estilo_parrafo))
    elementos.append(Spacer(1, 6))

    filas = []
    for nombre, descripcion in CONTENIDO["productos"]:
        filas.append([
            Paragraph(nombre, estilo_producto_titulo),
            Paragraph(descripcion, estilo_producto_desc),
        ])

    tabla = Table(filas, colWidths=[45 * mm, 115 * mm])
    tabla.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#DDDDDD")),
    ]))
    elementos.append(tabla)

    elementos.append(Spacer(1, 10))
    elementos.append(HRFlowable(width="100%", color=colors.HexColor("#DDDDDD"), thickness=1, spaceAfter=14))
    elementos.append(Paragraph(CONTENIDO["cierre"], estilo_parrafo))
    elementos.append(Paragraph(CONTENIDO["redes"], estilo_parrafo))
    elementos.append(Spacer(1, 8))
    elementos.append(Paragraph(f"🌐 {CONTENIDO['web']}", estilo_contacto))
    elementos.append(Paragraph(f"✉ {CONTENIDO['email']}", estilo_contacto))

    doc.build(elementos)
    print(f"Folleto generado en: {SALIDA}")


if __name__ == "__main__":
    construir_pdf()
