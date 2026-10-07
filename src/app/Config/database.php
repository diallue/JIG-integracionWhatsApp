<?php
class DATABASE_CONFIG {
    public $default = array(
        'datasource' => 'Database/Mysql',
        'persistent' => false,
        'host' => getenv('DB_HOST'),
        'login' => getenv('DB_USER'),
        'password' => getenv('DB_PASS'),
        'database' => getenv('DB_NAME'),
        'prefix' => '',
        'encoding' => 'utf8',
    );
}