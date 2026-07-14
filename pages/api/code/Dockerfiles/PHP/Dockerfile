FROM php:8.2-cli
WORKDIR /usr/src/app
RUN useradd -m sandboxuser
USER sandboxuser
CMD ["php", "sandbox.php"]
