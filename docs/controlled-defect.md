# Defecto controlado y corrección

Se ejecutó primero la referencia funcional completa. Después se cambió temporalmente en `src/app.mjs` la serialización de `totalCents`: de `Number(row.total_cents)` a `String(row.total_cents)`. La base conservó el entero, pero el contrato HTTP quedó incumplido: 2500 se enviaba como "2500".

OpenAPI exige `type: integer`. Las aserciones de esquema Order/OrderList y el validador independiente Ajv2020 detectaron la incompatibilidad. El servidor seguía respondiendo 200/201; eso no fue suficiente para aprobar las pruebas. La comprobación del importe también diferenció texto de número.

La colección completa produjo 234 aserciones: 219 aprobadas y 15 fallidas; se detectaron 16 respuestas incompatibles con el contrato. Estos valores aparecen en `evidence/runs/controlled-defect.json`. También se repitió la demostración en el Collection Runner de Postman 12.32.4: 219 aprobadas, 15 fallidas y cero errores de ejecución de scripts. La captura real es `evidence/screenshots/postman-controlled-defect.png`.

Se restauró la serialización numérica y se reinició el servidor. La ejecución corregida, la repetición desde una base limpia y el Runner de Postman volvieron a mostrar 234 aprobadas y cero fallidas. No se cambió OpenAPI ni se debilitaron aserciones.

## Reproducir la demostración completa

Ejecutar `npm run verify` con el puerto 3107 libre. El script arranca y detiene su propia API, restablece una base SQLite aislada y ejecuta:

1. Referencia correcta.
2. Inyección temporal del defecto y ejecución que debe fallar por el tipo de totalCents.
3. Restauración en un bloque finally.
4. Ejecución corregida desde una base limpia.
5. Nueva ejecución desde otra base limpia.
6. Prueba adicional de persistencia a través de un reinicio.

El script comprueba el hash SHA-256 del contrato antes y después y verifica que el archivo de implementación quedó exactamente restaurado. Si se termina forzosamente el proceso durante la inyección, debe restaurarse manualmente el cambio indicado antes de usar la API.

`defects/total-as-string.patch` conserva la modificación para inspección y demostración manual, sin activarla en el código final. Para aplicarla con la API detenida: `git apply defects/total-as-string.patch`; para corregir: `git apply -R defects/total-as-string.patch`. Reiniciar la API después de cada cambio.

Los informes sanitizados omiten tokens y contraseñas. No se publican las bases SQLite ni los ambientes locales.
