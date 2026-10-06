FROM php:8.1-apache

RUN apt-get update && apt-get install -y \
    libicu-dev \
    libzip-dev \
    unzip \
    git \
    && docker-php-ext-install \
    intl \
    pdo_mysql \
    zip
# Habilitar el módulo de reescritura para las URLs amigables
RUN a2enmod rewrite

COPY . /var/www/html/

ENV APACHE_DOCUMENT_ROOT /var/www/html/app/webroot
RUN sed -ri -s 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -s 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

RUN chown -R www-data:www-data /var/www/html/app/tmp /var/www/html/app/logs

RUN mkdir -p /var/www/html/app/tmp /var/www/html/app/logs && chown -R www-data:www-data /var/www/html/app/tmp /var/www/html/app/logs