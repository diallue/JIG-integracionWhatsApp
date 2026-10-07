FROM php:7.4-apache

RUN rm -rf /var/lib/apt/lists/* && apt-get update && apt-get install -y --fix-missing \
    libicu-dev \
    libzip-dev \
    unzip \
    git \
    && docker-php-ext-install \
    intl \
    pdo_mysql \
    zip

RUN a2enmod rewrite
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

COPY . /var/www/html/
ENV APACHE_DOCUMENT_ROOT /var/www/html/src/app/webroot

RUN sed -ri -s 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -s 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

RUN mkdir -p /var/www/html/app/tmp /var/www/html/app/logs && chown -R www-data:www-data /var/www/html/app/tmp /var/www/html/app/logs