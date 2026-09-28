<?php
/**
 * Fynova - Script de contacto
 * Recibe los datos del formulario y los envía por mail a comercial@fynova.com.ar
 */

header('Content-Type: application/json; charset=utf-8');

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

// --- Config ---
$destinatario = 'comercial@fynova.com.ar';
$asunto_base  = 'Nueva consulta desde fynova.com.ar';

// --- Helper: limpiar texto y evitar inyección de headers ---
function limpiar($valor) {
    $valor = trim($valor ?? '');
    // Elimina saltos de línea (previene inyección de headers en el mail)
    $valor = str_replace(["\r", "\n", "%0a", "%0d"], '', $valor);
    return htmlspecialchars($valor, ENT_QUOTES, 'UTF-8');
}

// --- Recibir y validar datos ---
$nombre   = limpiar($_POST['nombre'] ?? '');
$email    = limpiar($_POST['email'] ?? '');
$servicio = limpiar($_POST['servicio'] ?? 'No especificado');
$mensaje  = trim($_POST['mensaje'] ?? ''); // el mensaje sí puede tener saltos de línea, no va en un header

// Honeypot anti-spam: si este campo oculto viene lleno, es un bot
$honeypot = $_POST['sitio_web'] ?? '';
if (!empty($honeypot)) {
    // Respondemos como si estuviera todo bien, pero no mandamos nada
    echo json_encode(['ok' => true]);
    exit;
}

$errores = [];

if ($nombre === '') {
    $errores[] = 'Falta el nombre';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errores[] = 'El email no es válido';
}

if (!empty($errores)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => implode(', ', $errores)]);
    exit;
}

// Limpiar el mensaje para el cuerpo del mail (permitir saltos de línea, escapar HTML)
$mensaje_limpio = htmlspecialchars(trim($mensaje), ENT_QUOTES, 'UTF-8');
$mensaje_limpio = str_replace(["\r\n", "\r", "\n"], "\n", $mensaje_limpio);

// --- Armar el mail ---
$asunto_texto = "$asunto_base — $nombre";
// Codificar el asunto en MIME para que las tildes se vean bien en cualquier cliente de mail
$asunto = function_exists('mb_encode_mimeheader')
    ? mb_encode_mimeheader($asunto_texto, 'UTF-8', 'B', "\r\n")
    : $asunto_texto;

$cuerpo = "Nueva consulta recibida desde el formulario de fynova.com.ar\n\n";
$cuerpo .= "Nombre / Empresa: $nombre\n";
$cuerpo .= "Email: $email\n";
$cuerpo .= "Servicio de interés: $servicio\n";
$cuerpo .= "Mensaje:\n$mensaje_limpio\n";

// El "From" usa el mismo mail que el destinatario, ya que es el que usan en Fynova.
$from = 'comercial@fynova.com.ar';

$headers = "From: Formulario Fynova <$from>\r\n";
$headers .= "Reply-To: \"$nombre\" <$email>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// --- Enviar ---
$enviado = mail($destinatario, $asunto, $cuerpo, $headers);

if ($enviado) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo enviar el mail. Intentá de nuevo o escribinos por WhatsApp.']);
}
