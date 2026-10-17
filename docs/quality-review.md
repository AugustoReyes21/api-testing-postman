# Revisión técnica y criterios de entrega

Revisión realizada por Codex sobre su implementación aislada. No se atribuye a Claude Code: no se encontró instalado y no pudo ejecutarse. La revisión independiente de Claude no está cumplida; aplica la excepción explícita de los requisitos.

## Diseño, contrato y cobertura

- Siete operaciones documentadas en OpenAPI 3.1. Swagger Parser valida documento y referencias; Redocly CLI lo validó sin errores. Ajv2020 compila los ocho esquemas.
- Los validadores de entrada de la API usan el contrato. El verificador de intercambios comprueba por separado rutas, método, códigos, encabezados, Content-Type, parámetros, seguridad observada y cuerpos. Las aserciones Postman de JSON Schema no se presentan como validación completa de OpenAPI.
- 18 casos funcionales TC-01 a TC-18, 46 solicitudes y 234 aserciones. Las variantes de TC-08 y TC-14, las solicitudes de preparación y la limpieza no aumentan artificialmente el número de casos.
- Tokens e IDs se generan y capturan en ejecución. Las capturas gráficas incluyen IDs diferentes entre ejecuciones, sin depender de valores fijos.
- Se verifican autorización de GET/PUT/DELETE, integridad tras intentos ajenos y listado B sin recursos A.
- El primer PUT incrementa la versión; el segundo no escribe y conserva todo el recurso. GET confirma el efecto persistido. DELETE repetido también mantiene ausencia.
- La base SQLite sobrevive al reinicio de proceso; el informe adicional conserva ambas respuestas iguales.

## Hallazgos corregidos durante la implementación

- El sandbox de Newman proporciona una variable global data. Una declaración const de igual nombre en el ámbito global impedía ejecutar scripts. Se encapsularon los scripts en un bloque; después se ejecutaron todas las aserciones. No se redujeron verificaciones.
- Postman detectó inicialmente como supuesto secreto el token inválido literal de TC-07. Se sustituyó su encabezado por una variable definida dinámicamente con un valor inválido; se importó después la colección y se comprobó el rechazo 401.
- Se garantizó que updatedAt avance al menos un milisegundo en una transición real, incluso si la resolución del reloj coincide; la repetición idéntica mantiene el timestamp.
- El parche demostrativo inicial sin líneas de contexto no era aceptado por git apply. Se generó con contexto y se verificó su aplicabilidad.
- Al ajustar ese generador se detectó una variable local que ocultaba la función de inicio del verificador. Se renombró y se repitió la validación integral, incluida la persistencia al reiniciar.
- En Windows faltaba la base de zonas horarias de Python. El documento utiliza el desplazamiento UTC-06:00 correspondiente a America/Guatemala y meses en español.
- Ninguno de estos fallos de desarrollo se presenta como una ejecución satisfactoria. Los informes finales corresponden a ejecuciones corregidas.

## Evidencia y limitaciones

- Postman de escritorio 12.32.4 se abrió y controló realmente con las capacidades locales de Windows. Se importaron colección, ambiente de ejemplo y ambiente local ficticio. Se ejecutaron referencia, defecto y corrección en Collection Runner.
- Postman mostró 234/234 aprobadas en ejecuciones funcionales; en el defecto, 219 aprobadas y 15 fallidas. Los JSON de Newman y la captura de fallo coinciden.
- No se pudo exportar el JSON del Runner gráfico porque Postman mostró una restricción de plan. No se contrató ningún plan. Newman proporciona los archivos reutilizables sanitizados.
- Las capturas postman-* son recortes reales de pantalla; newman-* muestran un informe HTML de respuestas HTTP reales. No hay imágenes generadas ni pantallas recreadas.
- Los tokens se omiten de los reportes públicos y las contraseñas de prueba permanecen fuera de Git. Las capturas de ambiente muestran valores ocultos.
- El documento usa carta, Arial 11, márgenes de una pulgada, fondo blanco y texto negro. No incluye encabezado, pie, numeración de imágenes ni leyendas debajo.
- La revisión automática del PDF está en evidence/pdf-review.json. Se renderizaron y revisaron visualmente sus siete páginas: capturas completas y legibles, proporciones conservadas, tablas dentro de márgenes, sin páginas vacías ni encabezados, pies o leyendas numeradas. Se corrigieron dos desbordamientos de paginación de una versión preliminar.
- Microsoft Word 16.0 abrió el DOCX, pero la exportación COM no finalizó. Se cerró exclusivamente la sesión de esta tarea sin guardar cambios. El PDF final se convirtió desde el DOCX con ReportLab 5.0.0 y se comprobó con PyMuPDF; no se atribuye esa conversión a Word.
- npm audit --omit=dev no encontró vulnerabilidades de ejecución. Las dependencias antiguas de Newman tienen avisos registrados en evidence/dependency-audit.json. Esto no se presenta como una auditoría de seguridad de producción.
- No existe video y no se afirma que exista.
- El estudiante proporcionó su nombre y carné, que se incorporaron al PDF y al DOCX. Se eliminó la línea de curso, docente y sección según su instrucción.
- El docente necesita acceso de lectura al repositorio privado. La visibilidad no se cambia.

## Criterios

La matriz, el contrato, la colección, el ambiente de ejemplo, el código y el procedimiento de preparación están incluidos. Los casos de autenticación de dos usuarios, permisos, paginación, validación, persistencia, idempotencia, errores y esquemas se ejecutaron. El defecto activa un fallo real y la corrección lo elimina sin cambiar el contrato.

Los resultados de corrected y clean-repeat, más la persistencia después de reiniciar, son los controles de reproducibilidad. La publicación y el estado final de Git se verifican después de incorporar los entregables. Los permisos de lectura del docente requieren intervención del usuario.

Se creó un segundo worktree limpio desde el commit de la entrega, se instaló con npm ci (214 paquetes) y se ejecutó npm run verify completo. La referencia, la detección del defecto, las dos ejecuciones corregidas y la persistencia al reiniciar volvieron a cumplir lo esperado. evidence/fresh-checkout.json registra 18 casos, 46 solicitudes, 234 aserciones aprobadas y cero fallidas en su última ejecución, además de hashes coincidentes de implementación, contrato, colección y lockfile.
