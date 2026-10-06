<?php
App::uses('AppModel', 'Model');

class WhatsappSuscripcion extends AppModel {
    public $useTable = 'whatsapp_suscripciones';

    public function suscribirAlumno($nombreCurso, $telefono) {
        $clave = strtolower(trim($nombreCurso));
        
        $existe = $this->find('count', array(
            'conditions' => array(
                'WhatsappSuscripcion.curso' => $clave,
                'WhatsappSuscripcion.telefono' => $telefono
            )
        ));

        if (!$existe) {
            $this->create();
            return $this->save(array(
                'curso' => $clave,
                'telefono' => $telefono
            ));
        }
        return true;
    }

    public function obtenerSuscriptores($nombreCurso) {
        $clave = strtolower(trim($nombreCurso));
        $registros = $this->find('all', array(
            'conditions' => array('WhatsappSuscripcion.curso' => $clave),
            'fields' => array('telefono')
        ));

        $suscriptores = array();
        foreach ($registros as $registro) {
            $suscriptores[] = $registro['WhatsappSuscripcion']['telefono'];
        }
        return $suscriptores;
    }
}