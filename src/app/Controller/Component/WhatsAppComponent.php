<?php
App:uses('Component', 'Controller');

class WhatsAppComponent extends Component {
    private $token = '9e1fc0984964c266b23b5bb42ae99f7c';
    private $phoneId = '1425507657301849';

    public function enviarMensajeTexto($destinatario, $mensaje) {
        $url = "https://graph.facebook.com/v21.0/{$this->phoneId}/messages";
        $payload = [
            "messaging_product" => "whatsapp",
            "recipient_type" => "individual",
            "to" => $destinatario,
            "type" => "text",
            "text" => array("preview_url" => true, "body" => $mensaje)
        ];

        return this->hacerPeticion($url, $payload);
    }

    public function enviarPlantillaHorarios($destinatario) {
        $texto = "Puedes consultar todos tus horarios del curso 2026-2027 en el siguiente enlace:\nhttps://www.logronodeporte.es/horarios";
        return $this->enviarMensajeTexto($destinatario, $texto);
    }

    public function enviarEnlaceGrupo($destinatario, $nombreCurso, $enlaceGrupo) {
        $texto = "¡Hola! Aquí tienes el acceso al grupo oficial de coordinación para *{$nombreCurso}*:\n\n{$enlaceGrupo}\n\n";
        $texto .= "Únete para estar al tanto de todas las novedades de Logroño Deporte.";
        return $this->enviarMensajeTexto($destinatario, $texto);
    }

    public function enviarMenuPrincipal($destinatario) {
        $payload = array(
            "messaging_product" => "whatsapp",
            "recipient_type" => "individual",
            "to" => $destinatario,
            "type" => "interactive",
            "interactive" => array(
                "type" => "list",
                "header" => array("type" => "text", "text" => "Logroño Deporte"),
                "body" => array("text" => "¡Hola! Soy tu asistente virtual.\n\nDespliega el menú de abajo y selecciona la opción en la que te puedo ayudar hoy:"),
                "footer" => array("text" => "Atención automatizada 24/7"),
                "action" => array(
                    "button" => "Ver opciones",
                    "sections" => array(
                        array(
                            "title" => "Gestiones Rápidas",
                            "rows" => array(
                                array("id" => "cmd_reservar", "title" => "📅 Reservar espacio", "description" => "Inicia una nueva reserva paso a paso"),
                                array("id" => "cmd_horarios", "title" => "🕒 Ver Horarios", "description" => "Consulta los horarios de los cursos")
                            )
                        ),
                        array(
                            "title" => "Alumnos e Información",
                            "rows" => array(
                                array("id" => "cmd_ayuda_grupos", "title" => "💬 Grupos WhatsApp", "description" => "Únete al chat de tu curso"),
                                array("id" => "cmd_faqs", "title" => "❓ Preguntas Frecuentes", "description" => "Tarifas, normas y dudas comunes")
                            )
                        )
                    )
                )
            )
        );
        return $this->hacerPeticion('messages', 'POST', $payload);
    }

    public function enviarBotonesHoras($destinatario, $fecha) {
        $payload = array(
            "messaging_product" => "whatsapp",
            "recipient_type" => "individual",
            "to" => $destinatario,
            "type" => "interactive",
            "interactive" => array(
                "type" => "button",
                "body" => array("text" => "¡Anotado! Fecha: *{$fecha}*.\n\n¿En qué turno te gustaría reservar?\n\n_(❌ Selecciona una opción o escribe cancelar)_"),
                "action" => array(
                    "buttons" => array(
                        array("type" => "reply", "reply" => array("id" => "10:00", "title" => "🌅 Mañana (10:00)")),
                        array("type" => "reply", "reply" => array("id" => "15:00", "title" => "🌇 Tarde (15:00)")),
                        array("type" => "reply", "reply" => array("id" => "19:00", "title" => "🌙 Noche (19:00)"))
                    )
                )
            )
        );
        return $this->hacerPeticion('messages', 'POST', $payload);
    }

    public function crearGrupo($nombreCurso) {
        $url = "https://graph.facebook.com/v21.0/{$this->phoneId}/groups";
        $payload = [
            "messaging_product" => "whatsapp",
            "subject" => $nombreCurso
            
        ];

        return $this->hacerPeticion($url, $payload);
    }

    private function hacerPeticion($url, $method, $payload) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            "Authorization: Bearer {$this->token}",
            "Content-Type: application/json"
        ));

        $response = curl_exec($ch);
        return json_decode($response, true);
    }
}
?>