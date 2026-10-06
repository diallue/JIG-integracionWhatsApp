<?php
App::uses('AppModel', 'Model');

class WhatsAppEstado extends AppModel {
    public $useTable = 'whatsapp_estado';
    
    public function getEstadoUsuario($telefono) {
        $registro = $this->findByTelefono($telefono);
        return $registro ? $registro['WhatsappEstado']['estado'] : null;
    }

    public function setEstadoUsuario($telefono, $estado) {
        $registro = $this->findByTelefono($telefono);
        $id = $registro ? $registro['WhatsappEstado']['id'] : null;
        
        $this->create();
        return $this->save(array(
            'id' => $id,
            'telefono' => $telefono,
            'estado' => $estado
        ));
    }

    public function clearEstadoUsuario($telefono) {
        $registro = $this->findByTelefono($telefono);
        if ($registro) {
            return $this->deleteAll(array($registro['WhatsappEstado']['id']));
        }
        return false;
    }

    public function validarEstadoUsuario($telefono, $estado) {
        $registro = $this->findByTelefono($telefono);
        return $registro && $registro['WhatsappEstado']['estado'] === $estado;
    }

    public function guardarDatoTemporal($telefono, $clave, $valor) {
        $registro = $this->findByTelefono($telefono);
        $id = $registro ? $registro['WhatsappEstado']['id'] : null;
        
        $datos = array();
        if ($registro && !empty($registro['WhatsappEstado']['datos_temporales'])) {
            $datos = json_decode($registro['WhatsappEstado']['datos_temporales'], true);
        }
        
        $datos[$clave] = $valor;
        
        $this->create();
        return $this->save(array(
            'id' => $id,
            'telefono' => $telefono,
            'datos_temporales' => json_encode($datos)
        ));
    }

    
}
?>