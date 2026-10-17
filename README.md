# API Testing con Postman

Repositorio para organizar y ejecutar pruebas de API con Postman.

## Estructura

- `collections/`: colecciones exportadas de Postman.
- `environments/`: entornos exportados sin credenciales ni secretos.

## Uso

1. Importa en Postman los archivos JSON de `collections/`.
2. Importa el entorno correspondiente desde `environments/`.
3. Configura localmente los valores sensibles, como tokens y contraseñas.
4. Ejecuta la colección desde Postman o con Newman.

## Seguridad

No subas tokens, contraseñas, claves de API ni valores secretos. Usa variables locales o marca los valores sensibles como secretos en Postman.
