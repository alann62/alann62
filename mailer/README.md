# Fynova - Envío de correos comerciales desde Excel

Programa en Python para enviar el correo comercial de Fynova (con folleto en
PDF adjunto) a la lista de clientes de un Excel, usando la casilla
`comercial@fynova.com.ar`.

## 1. Instalación

```bash
cd mailer
python -m venv venv
source venv/bin/activate   # en Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configurar credenciales

```bash
cp .env.example .env
```

Editar `.env` y completar:

- `SMTP_HOST` / `SMTP_PORT`: datos del proveedor de correo (ej. Office 365,
  Google Workspace, o el que use `fynova.com.ar`).
- `SMTP_USER`: `comercial@fynova.com.ar`
- `SMTP_PASSWORD`: la contraseña de la cuenta, o mejor aún, una
  **contraseña de aplicación** si el proveedor lo permite (más seguro que la
  contraseña normal).
- `CORREOS_POR_MINUTO`: para no saturar el servidor ni caer en spam (por
  defecto 20).

**El archivo `.env` nunca se sube a git** (ya está en `.gitignore`).

## 3. Generar el folleto en PDF

El contenido del folleto se edita en `generar_folleto.py` (diccionario
`CONTENIDO`): productos, textos, web y email de contacto.

```bash
python generar_folleto.py
```

Esto genera `salida/folleto_fynova.pdf`, que se adjunta automáticamente a
cada correo.

## 4. Preparar el Excel de clientes

El Excel debe tener (al menos) estas columnas, con esos nombres exactos:

| nombre       | email                     | empresa (opcional) |
|--------------|---------------------------|---------------------|
| Juan Pérez   | juan.perez@ejemplo.com    | Constructora SA     |

Para generar un archivo de ejemplo:

```bash
python crear_excel_ejemplo.py
```

## 5. Probar sin enviar nada (dry-run)

Siempre conviene probar antes con `--dry-run`, que solo muestra en pantalla
a quién se le enviaría, sin mandar ningún correo real:

```bash
python enviar_correos.py --excel clientes_ejemplo.xlsx --dry-run
```

## 6. Enviar los correos

Probar primero con pocos destinatarios:

```bash
python enviar_correos.py --excel clientes.xlsx --limite 5
```

Y luego con la lista completa:

```bash
python enviar_correos.py --excel clientes.xlsx
```

Cada envío queda registrado en `logs/envios.log` (enviados y fallidos).

## Buenas prácticas incluidas

- El texto del correo invita a visitar `fynova.com.ar` y a seguir las redes
  sociales de la empresa.
- Se valida el formato de cada email antes de enviar, y se descartan filas
  inválidas (se informan en el log).
- Se limpia el texto de nombre/empresa para evitar inyección de cabeceras
  de correo.
- El correo incluye una línea de "baja" (para cumplir buenas prácticas /
  Ley de Protección de Datos Personales).
- Límite de correos por minuto configurable, para evitar que el proveedor
  marque la cuenta como spam.
- Modo `--dry-run` para probar sin enviar nada real.

## Personalización

- **Textos del correo**: editar `templates/email_template.html`.
- **Asunto**: variable `ASUNTO` en `enviar_correos.py`.
- **Folleto (productos, textos, contacto)**: diccionario `CONTENIDO` en
  `generar_folleto.py`.
