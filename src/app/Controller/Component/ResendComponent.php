<?php
App::uses('Component', 'Controller');

class ResendComponent extends Component {
    public function __construct(ComponentCollection $collection, $settings = array()) {
    parent::__construct($collection, $settings);
    $this->apiKey = getenv('RESEND_API_KEY'); 
}

    public function enviarCorreo($emailAlumno, $enlaceGrupo, $nombreCurso) {
        $url = "https://api.resend.com/v1/emails";
        $cuerpo = "¡Hola! Te confirmamos tu inscripción en {$nombreCurso}.\n\n";
        $cuerpo .= "Únete al grupo oficial de WhatsApp aquí: {$enlaceGrupo}\n\n¡Te esperamos!";

        $payload = array(
            "from" => "Logroño Deporte <onboarding@resend.dev>",
            "to" => array($emailAlumno),
            "subject" => "Bienvenido al curso de {$nombreCurso} - Logroño Deporte",
            "text" => $cuerpo
        );

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            "Authorization: Bearer {$this->apiKey}",
            "Content-Type: application/json"
        ));
        $response = curl_exec($ch);
        
        return json_decode($response, true);
    }
}
?>