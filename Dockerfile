FROM php:8.3-cli-bookworm

WORKDIR /var/www/html
COPY --chown=www-data:www-data . /var/www/html

USER www-data
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "/var/www/html"]
