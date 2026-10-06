<?php
App::uses('AppController', 'Controller');

class ApiWhatsappController extends AppController {

    public $uses = array('Reserva', 'Localizador', 'ReservaHorarios', 'Servicio', 'Sala');

    public function beforeFilter() {
        parent::beforeFilter();
        $this->Auth->allow('reservar');
    }

    public function reservar() {
        $this->autoRender = false;
        $this->response->type('json');

        if ($this->request->is('post')) {
            $datos = $this->request->input('json_decode', true);

            if (!empty($datos['telefono']) && !empty($datos['fecha']) && !empty($datos['hora'])) {
                
                $fecha_sql = preg_replace('#(\d{2})[/.-](\d{2})[/.-](\d{4})#', '$3-$2-$1', $datos['fecha']);
                $hora_sql  = $datos['hora'] . ':00';
                $unidades  = !empty($datos['plazas']) ? (int)$datos['plazas'] : 1;
                $nombre    = !empty($datos['nombre']) ? $datos['nombre'] : 'Cliente WhatsApp';

                $reserva = $this->Reserva->find('first', array(
                    'conditions' => array(
                        'Reserva.fecha' => $fecha_sql,
                        'Reserva.hora_inicio' => $hora_sql,
                        'Reserva.plazas_libres >=' => $unidades,
                        'Reserva.bloqueado' => 0
                    ),
                    'recursive' => 0
                ));

                if (!$reserva) {
                    return json_encode(array('success' => false, 'error' => 'No hay horarios disponibles o plazas suficientes.'));
                }

                $sala_horario_id = $reserva['Reserva']['id'];
                $sala_id         = $reserva['Reserva']['sala_id'];
                $instalacion_id  = $reserva['Sala']['instalacion_id'];

                $servicio = $this->Servicio->findBySalaId($sala_id);
                $servicio_id = $servicio ? $servicio['Servicio']['id'] : 0;

                App::import('Vendor', 'funciones');
                $identificador = generarLocalizador(6);

                $this->Localizador->create();
                $localizadorGuardado = $this->Localizador->save(array(
                    'localizador'     => $identificador,
                    'fecha_creacion'  => date('Y-m-d'),
                    'timestamp'       => date('Y-m-d H:i:s'),
                    'fecha_uso'       => $fecha_sql,
                    'nombre'          => $nombre,
                    'telefono'        => $datos['telefono'],
                    'email'           => '',
                    'unidades'        => $unidades,
                    'plazas_adulto'   => $unidades,
                    'plazas_infantil' => 0,
                    'servicio_id'     => $servicio_id,
                    'instalacion_id'  => $instalacion_id,
                    'tipo_pago'       => 1,
                    'estado'          => 'pagado', 
                    'web'             => 0,
                    'pases_totales'   => 1,
                    'servicio_pases'  => 0
                ));

                if ($localizadorGuardado) {
                    $this->ReservaHorarios->create();
                    $this->ReservaHorarios->save(array(
                        'sala_horario_id' => $sala_horario_id,
                        'instalacion_id'  => $instalacion_id,
                        'localizador'     => $identificador,
                        'unidades'        => $unidades,
                        'nombre'          => $nombre,
                        'telefono'        => $datos['telefono'],
                        'estado'          => 'finalizada',
                        'timestamp'       => date('Y-m-d H:i:s'),
                        'fecha_reserva'   => date('Y-m-d H:i:s'),
                        'activa'          => 1
                    ));

                    $plazas_libres = $reserva['Reserva']['plazas_libres'] - $unidades;
                    $this->Reserva->id = $sala_horario_id;
                    $this->Reserva->saveField('plazas_libres', $plazas_libres);

                    $archivo_qr = ROOT . DS . 'app' . DS . 'webroot' . DS . 'img' . DS . 'QR' . DS . $identificador . '.png';
                    if (!file_exists($archivo_qr)) {
                        require_once ROOT . DS . 'app' . DS . 'Vendor' . DS . 'QR' . DS . 'phpqrcode.php';
                        QRcode::png($identificador, $archivo_qr, 'L', 6);
                    }

                    return json_encode(array(
                        'success'     => true,
                        'localizador' => $identificador,
                        'mensaje'     => 'Reserva insertada desde la API independiente.'
                    ));
                }

                return json_encode(array('success' => false, 'error' => 'Fallo al insertar el localizador.'));
            } else {
                return json_encode(array('success' => false, 'error' => 'Faltan parámetros en el JSON.'));
            }
        }
        return json_encode(array('success' => false, 'error' => 'Petición inválida. Usa POST.'));
    }
}