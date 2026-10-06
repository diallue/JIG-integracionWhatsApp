<?php
App::uses("AppModel", "Model");

class WhatsAppEnlace extends AppModel {
    public $useTable = "whatsapp_enlace";

    public function guardarEnlaceCurso($nombreCurso, $enlace) {
        $clave = strtolower(trim($nombreCurso));
        $registro = $this->findByCurso($clave);
        $id = $registro ? $registro['WhatsappEnlace']['id'] : null;

        $this->create();
        return $this->save(array(
            'id' => $id,
            'curso' => $clave,
            'enlace' => $enlace
        ));
    }

    public function obtenerEnlaceCurso($nombreCurso) {
        $clave = strtolower(trim($nombreCurso));
        $registro = $this->findByCurso($clave);
        return $registro ? $registro['WhatsappEnlace']['enlace'] : null;
    }
}
?>