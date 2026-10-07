<?php
App::uses('AppController', 'Controller');

class ApiWhatsAppController extends AppController {

    public $uses = array(
        'Reserva', 'Localizador', 'ReservaHorarios', 'Servicio', 'Sala',
        'WhatsappEstado', 'WhatsappEnlace', 'WhatsappSuscripcion'
    );
    
    public $components = array('Whatsapp', 'Resend');

    public function beforeFilter() {
        parent::beforeFilter();
        $this->Auth->allow('reservar', 'webhook', 'inscribir_alumno', 'forzar_pin', 'crear_grupo');
    }

    public function inscribir_alumno() {
        $this->autoRender = false;
        $this->response->type('json');
        
        $datos = $this->request->input('json_decode', true);
        if (empty($datos['email']) || empty($datos['nombreCurso'])) {
            $this->response->statusCode(400);
            return json_encode(array('error' => 'Faltan datos (email o nombreCurso)'));
        }

        $enlace = $this->WhatsappEnlace->obtenerEnlaceCurso($datos['nombreCurso']);
        
        if ($enlace) {
            $this->Resend->enviarEmailInvitacion($datos['email'], $enlace, $datos['nombreCurso']);
            return json_encode(array('status' => 'Inscripción procesada. Email enviado con el enlace del grupo.'));
        } else {
            $this->response->statusCode(404);
            return json_encode(array('status' => 'Matrícula procesada, pero aún no hay enlace de WhatsApp guardado por el monitor.'));
        }
    }

    public function crear_grupo() {
        $this->autoRender = false;
        $this->response->type('json');
        
        $datos = $this->request->input('json_decode', true);
        if (empty($datos['nombreCurso'])) {
            $this->response->statusCode(400);
            return json_encode(array('error' => 'Falta el nombreCurso'));
        }

        $metaResponse = $this->Whatsapp->crearGrupo("LD - " . $datos['nombreCurso']);
        
        if (isset($metaResponse['invite_link'])) {
            $this->WhatsappEnlace->guardarEnlaceCurso($datos['nombreCurso'], $metaResponse['invite_link']);
            return json_encode(array(
                'status' => 'Grupo creado con éxito y enlazado al curso.',
                'id_grupo' => $metaResponse['id'],
                'enlace' => $metaResponse['invite_link']
            ));
        } else {
            $this->response->statusCode(500);
            return json_encode(array('error' => 'Meta rechazó la creación (revisa si el número tiene los permisos OBA).'));
        }
    }

    public function forzar_pin() {
        $this->autoRender = false;
        $this->response->type('json');
        return json_encode(array('status' => 'Ruta operativa'));
    }

    public function webhook() {
        $this->autoRender = false;
        $pinAdmin = getenv('PIN_ADMIN');

        if ($this->request->is('get')) {
            $verify_token = getenv('WHATSAPP_VERIFY_TOKEN');
            if ($this->request->query('hub_mode') === 'subscribe' && $this->request->query('hub_verify_token') === $verify_token) {
                $this->response->statusCode(200);
                echo $this->request->query('hub_challenge');
                exit;
            } else {
                $this->response->statusCode(403);
            }
            return;
        }

        if ($this->request->is('post')) {
            $this->response->statusCode(200);
            
            $payload = file_get_contents('php://input');
            $body = json_decode($payload, true);

            if (isset($body['object']) && $body['object'] === 'whatsapp_business_account') {
                $value = $body['entry'][0]['changes'][0]['value'];
                
                if (isset($value['messages'][0])) {
                    $mensajeEntrante = $value['messages'][0];
                    $remitente = $mensajeEntrante['from'];
                    $nombrePerfil = isset($value['contacts'][0]['profile']['name']) ? $value['contacts'][0]['profile']['name'] : "Cliente";
                    
                    $textoOriginal = "";
                    $textoMinusculas = "";
                    
                    if ($mensajeEntrante['type'] === 'text') {
                        $textoOriginal = $mensajeEntrante['text']['body'];
                        $textoMinusculas = strtolower(trim($textoOriginal));
                    } elseif ($mensajeEntrante['type'] === 'interactive') {
                        if (isset($mensajeEntrante['interactive']['button_reply'])) {
                            $textoOriginal = $mensajeEntrante['interactive']['button_reply']['id'];
                        } elseif (isset($mensajeEntrante['interactive']['list_reply'])) {
                            $textoOriginal = $mensajeEntrante['interactive']['list_reply']['id'];
                        }
                        if (!$textoOriginal) return;
                        $textoMinusculas = strtolower(trim($textoOriginal));
                    } else {
                        return;
                    }

                    $estadoActual = $this->WhatsappEstado->getEstadoUsuario($remitente);
                    
                    if ($estadoActual) {
                        if ($textoMinusculas === 'cancelar') {
                            $this->WhatsappEstado->clearEstadoUsuario($remitente);
                            $this->Whatsapp->enviarMensajeTexto($remitente, "❌ Operación cancelada. ¿En qué más puedo ayudarte?");
                            return;
                        }

                        if ($estadoActual === 'ESPERANDO_DNI') {
                            $esValido = $this->WhatsappEstado->validarAlumno($textoOriginal);
                            if ($esValido) {
                                $datos = $this->WhatsappEstado->getDatosTemporales($remitente);
                                $enlace = $this->WhatsappEnlace->obtenerEnlaceCurso($datos['curso_solicitado']);
                                
                                $this->WhatsappSuscripcion->suscribirAlumno($datos['curso_solicitado'], $remitente);
                                $this->Whatsapp->enviarEnlaceGrupo($remitente, $datos['curso_solicitado'], $enlace);
                                $this->WhatsappEstado->clearEstadoUsuario($remitente);
                            } else {
                                $this->Whatsapp->enviarMensajeTexto($remitente, "❌ Lo siento, no encuentro ese DNI o número de abonado en la lista de inscritos. Revísalo y vuelve a escribirlo, o escribe *cancelar* para salir.");
                            }
                            return;
                        }

                        if ($estadoActual === 'ESPERANDO_FECHA') {
                            $this->WhatsappEstado->guardarDatoTemporal($remitente, 'fecha', $textoOriginal);
                            $this->WhatsappEstado->setEstadoUsuario($remitente, 'ESPERANDO_HORA');
                            $this->Whatsapp->enviarBotonesHora($remitente, $textoOriginal);
                            return;
                        }

                        if ($estadoActual === 'ESPERANDO_HORA') {
                            $this->WhatsappEstado->guardarDatoTemporal($remitente, 'hora', $textoOriginal);
                            $this->WhatsappEstado->setEstadoUsuario($remitente, 'ESPERANDO_PLAZAS');
                            $this->Whatsapp->enviarMensajeTexto($remitente, "✅ Perfecto, a las {$textoOriginal}.\n\n¿Cuántas personas vais a ser en total? (Dime un número, ej: 4)\n\n_(❌ Escribe *cancelar* en cualquier momento para salir)_");
                            return;
                        }

                        if ($estadoActual === 'ESPERANDO_PLAZAS') {
                            $this->Whatsapp->enviarMensajeTexto($remitente, "⏳ Comprobando disponibilidad y procesando tu reserva...");
                            
                            $datos = $this->WhatsappEstado->getDatosTemporales($remitente);
                            $datos['plazas'] = $textoOriginal;
                            $datos['nombre'] = $nombrePerfil;
                            $datos['telefono'] = $remitente;
                            
                            $localizador = $this->_procesarReserva($datos);
                            
                            if ($localizador) {
                                $this->Whatsapp->enviarMensajeTexto($remitente, "🎉 ¡Reserva confirmada con éxito!\n\n🔖 Localizador: *{$localizador}*\n📅 Fecha: {$datos['fecha']}\n⏰ Hora: {$datos['hora']}\n👥 Plazas: {$datos['plazas']}\n\nTe esperamos.");
                            } else {
                                $this->Whatsapp->enviarMensajeTexto($remitente, "❌ Lo siento, no hay disponibilidad para esa fecha/hora o los datos son incorrectos. Por favor, inténtalo de nuevo más tarde.");
                            }
                            
                            $this->WhatsappEstado->clearEstadoUsuario($remitente);
                            return;
                        }
                    }

                    if (preg_match('/^!nuevo\s+(\S+)\s+(.+?)\s+(https:\/\/chat\.whatsapp\.com\/\S+)$/i', $textoOriginal, $matchAdmin)) {
                        if ($matchAdmin[1] === $pinAdmin) {
                            $this->WhatsappEnlace->guardarEnlaceCurso($matchAdmin[2], $matchAdmin[3]);
                            $this->Whatsapp->enviarMensajeTexto($remitente, "✅ ¡Exito! Enlace guardado correctamente en la base de datos para el curso: *{$matchAdmin[2]}*");
                        } else {
                            $this->Whatsapp->enviarMensajeTexto($remitente, "Acceso denegado: PIN de seguridad incorrecto.");
                        }
                        return;
                    }

                    if (preg_match('/^!aviso\s+(\S+)\s+["\']?(.+?)["\']?\s+(.+)$/i', $textoOriginal, $matchAviso)) {
                        if ($matchAviso[1] === $pinAdmin) {
                            $nombreCurso = $matchAviso[2];
                            $suscriptores = $this->WhatsappSuscripcion->obtenerSuscriptores($nombreCurso);
                            
                            if (!empty($suscriptores)) {
                                $count = count($suscriptores);
                                $this->Whatsapp->enviarMensajeTexto($remitente, "⏳ Enviando aviso a {$count} alumnos de *{$nombreCurso}*...");
                                $enviados = 0;
                                foreach ($suscriptores as $tel) {
                                    $this->Whatsapp->enviarMensajeTexto($tel, "⚠️ *AVISO DE LOGROÑO DEPORTE*\n📘 Curso: {$nombreCurso}\n\n{$matchAviso[3]}");
                                    $enviados++;
                                }
                                $this->Whatsapp->enviarMensajeTexto($remitente, "✅ ¡Aviso enviado con éxito a {$enviados} alumnos!");
                            } else {
                                $this->Whatsapp->enviarMensajeTexto($remitente, "❌ No hay ningún alumno validado en el curso de *{$nombreCurso}*.");
                            }
                        } else {
                            $this->Whatsapp->enviarMensajeTexto($remitente, "Acceso denegado: PIN de seguridad incorrecto.");
                        }
                        return;
                    }

                    if (preg_match('/^quiero unirme al grupo de (.+)$/i', $textoMinusculas, $matchUsuario)) {
                        $nombreCursoSolicitado = $matchUsuario[1];
                        $enlaceEncontrado = $this->WhatsappEnlace->obtenerEnlaceCurso($nombreCursoSolicitado);
                        
                        if ($enlaceEncontrado) {
                            $this->WhatsappEstado->guardarDatoTemporal($remitente, 'curso_solicitado', $nombreCursoSolicitado);
                            $this->WhatsappEstado->setEstadoUsuario($remitente, 'ESPERANDO_DNI');
                            $this->Whatsapp->enviarMensajeTexto($remitente, "Tengo el enlace para el grupo de *{$nombreCursoSolicitado}*.\n\n🔒 Por seguridad, indícame primero tu *fecha de nacimiento* y tu *Número de Abonado* para verificar tu inscripción.\n\n_(❌ Escribe *cancelar* en cualquier momento para salir)_");
                        } else {
                            $this->Whatsapp->enviarMensajeTexto($remitente, "Lo siento, todavía no tengo registrado un grupo para el curso de *{$nombreCursoSolicitado}*. Por favor, consulta con Logroño Deporte o tu monitor.");
                        }
                        return;
                    }

                    if (preg_match('/\b(hola|menu|menú|empezar|ayuda)\b/', $textoMinusculas)) {
                        $this->Whatsapp->enviarMenuPrincipal($remitente);
                        return;
                    }

                    if ($textoMinusculas === 'cmd_horarios' || preg_match('/\b(horario|horarios|clases|clase|turno|hoy|mañana|semana)\b/', $textoMinusculas)) {
                        $this->Whatsapp->enviarPlantillaHorarios($remitente);
                        return;
                    }

                    if ($textoMinusculas === 'cmd_reservar' || preg_match('/\b(reservar|reserva)\b/', $textoMinusculas)) {
                        $this->WhatsappEstado->setEstadoUsuario($remitente, 'ESPERANDO_FECHA');
                        $this->Whatsapp->enviarMensajeTexto($remitente, "📅 ¡Estaré encantado de gestionar tu reserva!\n\n¿Para qué fecha la necesitas? (Dime el día, ej: 25/10/2026)\n\n_(❌ Escribe *cancelar* en cualquier momento para salir)_");
                        return;
                    }

                    if ($textoMinusculas === 'cmd_ayuda_grupos') {
                        $this->Whatsapp->enviarMensajeTexto($remitente, "Para unirte a un grupo, solo tienes que decirme:\n\n*Quiero unirme al grupo de [Nombre del Curso]*\n\nTe pediré tu DNI por seguridad y te daré el enlace.");
                        return;
                    }

                    if ($textoMinusculas === 'cmd_faqs') {
                        $this->Whatsapp->enviarMensajeTexto($remitente, "❓ *PREGUNTAS FRECUENTES*\n\n*1. ¿Cómo me abono?*\nPuedes abonarte online en nuestra web o presencialmente en Las Gaunas.\n\n*2. ¿Qué incluye la tarifa?*\nAcceso libre a piscinas, pistas de atletismo y descuentos en reservas.\n\n*3. ¿Puedo cancelar una reserva?*\nSí, hasta 24 horas antes desde tu área de usuario en la web.\n\n🌐 Para más detalles, visita: _https://www.logronodeporte.es_");
                        return;
                    }

                    $this->Whatsapp->enviarMenuPrincipal($remitente);
                }
            }
        }
    }

    public function reservar() {
        $this->autoRender = false;
        $this->response->type('json');
        
        if ($this->request->is('post')) {
            $datos = $this->request->input('json_decode', true);
            $localizador = $this->_procesarReserva($datos);
            
            if ($localizador) {
                return json_encode(array('success' => true, 'localizador' => $localizador, 'mensaje' => 'Reserva insertada.'));
            } else {
                return json_encode(array('success' => false, 'error' => 'Fallo al procesar la reserva.'));
            }
        }
        return json_encode(array('success' => false, 'error' => 'Petición inválida. Usa POST.'));
    }

    private function _procesarReserva($datos) {
        if (empty($datos['telefono']) || empty($datos['fecha']) || empty($datos['hora'])) {
            return false;
        }

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
            return false;
        }

        $sala_horario_id = $reserva['Reserva']['id'];
        $sala_id = $reserva['Reserva']['sala_id'];
        $instalacion_id = $reserva['Sala']['instalacion_id'];
        
        $servicio = $this->Servicio->findBySalaId($sala_id);
        $servicio_id = $servicio ? $servicio['Servicio']['id'] : 0;
        
        App::import('Vendor', 'funciones');
        $identificador = generarLocalizador(6);
        
        $this->Localizador->create();
        $localizadorGuardado = $this->Localizador->save(array(
            'localizador' => $identificador,
            'fecha_creacion' => date('Y-m-d'),
            'timestamp' => date('Y-m-d H:i:s'),
            'fecha_uso' => $fecha_sql,
            'nombre' => $nombre,
            'telefono' => $datos['telefono'],
            'email' => '',
            'unidades' => $unidades,
            'plazas_adulto' => $unidades,
            'plazas_infantil' => 0,
            'servicio_id' => $servicio_id,
            'instalacion_id' => $instalacion_id,
            'tipo_pago' => 1,
            'estado' => 'pagado', 
            'web' => 0,
            'pases_totales' => 1,
            'servicio_pases' => 0
        ));

        if ($localizadorGuardado) {
            $this->ReservaHorarios->create();
            $this->ReservaHorarios->save(array(
                'sala_horario_id' => $sala_horario_id,
                'instalacion_id' => $instalacion_id,
                'localizador' => $identificador,
                'unidades' => $unidades,
                'nombre' => $nombre,
                'telefono' => $datos['telefono'],
                'estado' => 'finalizada',
                'timestamp' => date('Y-m-d H:i:s'),
                'fecha_reserva' => date('Y-m-d H:i:s'),
                'activa' => 1
            ));
            
            $plazas_libres = $reserva['Reserva']['plazas_libres'] - $unidades;
            $this->Reserva->id = $sala_horario_id;
            $this->Reserva->saveField('plazas_libres', $plazas_libres);
            
            $archivo_qr = ROOT . DS . 'app' . DS . 'webroot' . DS . 'img' . DS . 'QR' . DS . $identificador . '.png';
            if (!file_exists($archivo_qr)) {
                require_once ROOT . DS . 'app' . DS . 'Vendor' . DS . 'QR' . DS . 'phpqrcode.php';
                QRcode::png($identificador, $archivo_qr, 'L', 6);
            }
            
            return $identificador;
        }

        return false;
    }
}