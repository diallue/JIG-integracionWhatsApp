<?php

if (isset($_GET['hub_challenge']) && isset($_GET['hub_verify_token'])) {
    if ($_GET['hub_verify_token'] === '9e1fc0984964c266b23b5bb42ae99f7c') {
        http_response_code(200);
        while (ob_get_level()) ob_end_clean();
        echo trim($_GET['hub_challenge']);
        exit;
    }
}

error_reporting(0);
ini_set('display_errors', 0);

define('APP_DIR', 'app');
define('DS', DIRECTORY_SEPARATOR);
define('ROOT', dirname(dirname(__DIR__)));
define('WEBROOT_DIR', basename(__DIR__));
define('WWW_ROOT', __DIR__ . DS);

if (file_exists(ROOT . DS . 'vendor' . DS . 'autoload.php')) {
    require ROOT . DS . 'vendor' . DS . 'autoload.php';
}

if (!defined('CAKE_CORE_INCLUDE_PATH')) {
    if (function_exists('ini_set')) {
        ini_set('include_path', ROOT . DS . 'lib' . PATH_SEPARATOR . ini_get('include_path'));
    }
    if (!include 'Cake' . DS . 'bootstrap.php') {
        $failed = true;
    }
} else {
    if (!include CAKE_CORE_INCLUDE_PATH . DS . 'Cake' . DS . 'bootstrap.php') {
        $failed = true;
    }
}

if (!empty($failed)) {
    trigger_error("CakePHP core could not be found. Check the value of CAKE_CORE_INCLUDE_PATH in APP/webroot/index.php. It should point to the directory containing your " . DS . "cake core directory and your " . DS . "vendors root directory.", E_USER_ERROR);
}

App::uses('Dispatcher', 'Routing');

$Dispatcher = new Dispatcher();
$Dispatcher->dispatch(
    new CakeRequest(),
    new CakeResponse()
);