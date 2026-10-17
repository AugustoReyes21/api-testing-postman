# Automatización de pruebas de API con Postman

API académica de pedidos con Express y SQLite, contrato OpenAPI 3.1 y colección de Postman. Repositorio privado: el docente necesita permisos de lectura.

## Entrega y resultados

- [Informe PDF](artifacts/informe-api-postman.pdf) y [DOCX editable](artifacts/informe-api-postman.docx).
- [Matriz de pruebas](docs/test-matrix.md) y [CSV](docs/test-matrix.csv).
- [OpenAPI 3.1](openapi/openapi.json), [colección Postman](collections/pedidos.postman_collection.json) y [ambiente sin secretos](environments/pedidos.example.postman_environment.json).
- [Resultados finales](evidence/runs/clean-repeat.json), [informe HTML](evidence/execution-report.html) y [capturas auténticas](evidence/screenshots/).
- [Defecto controlado](docs/controlled-defect.md), [revisión técnica](docs/quality-review.md), [registro de trabajo](docs/project-log.md) y [referencias](docs/references.md).

Se ejecutaron **18 casos funcionales distintos**, mediante **46 solicitudes y 234 aserciones por ejecución completa**. Las solicitudes SETUP y CLEANUP son auxiliares; no cuentan como casos adicionales. Referencia, corrección y repetición limpia: **234 aprobadas y 0 fallidas**. Defecto temporal: **219 aprobadas, 15 fallidas y 16 respuestas incompatibles con el contrato**.

La colección se importó y ejecutó realmente en **Postman de escritorio 12.32.4**, con 234 aprobadas, 0 fallidas y 0 errores después de corregir el defecto. También se ejecutó el defecto en su Collection Runner. Las imágenes postman-* son capturas auténticas de la ventana. Las imágenes newman-* muestran el informe de respuestas reales de Newman; no simulan Postman. La exportación JSON del Runner estaba restringida por el plan: se conservan capturas y resultados JSON sanitizados de Newman.

Claude Code no estaba instalado ni disponible en PATH o en las rutas habituales comprobadas. No se inició sesión ni se atribuye a Claude ninguna implementación o revisión. Codex realizó el desarrollo y las comprobaciones; la revisión independiente de Claude queda pendiente si se instala y autentica después.

## Requisitos y versiones verificadas

Node.js **24.18.0**, npm **11.16.0**, Git **2.55.0.windows.3**, Express **5.3.0**, SQLite **3.53.1**, Newman **6.2.3**, Ajv **8.20.0**, Swagger Parser **13.1.0**, Redocly CLI **2.64.1** y Postman **12.32.4**. [Registro completo](evidence/tool-versions.json).

Para API y pruebas basta Node.js 24 o posterior con npm; se recomienda 24.18.0. SQLite viene integrado en Node. No se requiere servidor de base de datos.

Los documentos se generaron con Python 3.12, python-docx, ReportLab, PyMuPDF y Pillow. Microsoft Word 16.0 estaba disponible, pero su exportación COM no terminó; se convirtió el DOCX fuente con ReportLab conservando el formato académico. Chrome se utilizó para capturar el informe HTML complementario.

## Instalación, datos y servidor

```powershell
git clone https://github.com/AugustoReyes21/api-testing-postman.git
cd api-testing-postman
npm ci
npm run generate
npm run validate
npm run seed
npm start
```

La API estará en **http://127.0.0.1:3000**. GET /health devuelve {"status":"ok","storage":"sqlite"}. Por defecto escucha solo en la interfaz de bucle local.

Ejecutar **npm run seed con el servidor detenido**. Restablece exclusivamente los datos de esta práctica y deja cero pedidos. Crea los usuarios ficticios ana@example.test y bruno@example.test con contraseñas aleatorias de prueba. Guarda la base en .runtime/orders.sqlite y el ambiente operativo en .runtime/postman.local.json; ambos están excluidos de Git.

El ambiente publicado tiene baseUrl, emailA, emailB, passwordA y passwordB, con contraseñas vacías. Para operar, importar el ambiente local generado. No se utilizan cuentas ni contraseñas reales. Las contraseñas se almacenan con scrypt y sal; los tokens opacos se guardan como hash y expiran en una hora.

## Ejecutar en Postman de escritorio

1. Iniciar la API siguiendo los pasos anteriores.
2. En Postman, pulsar **Ctrl+O** o **Use resources or import → Import**.
3. Importar collections/pedidos.postman_collection.json.
4. Importar environments/pedidos.example.postman_environment.json para revisar la plantilla sin secretos.
5. Importar además .runtime/postman.local.json y seleccionar **Pedidos LOCAL (credenciales ficticias)**. Las contraseñas aparecen ocultas.
6. Abrir **Pedidos | Práctica automatizada (18 casos)** y pulsar **Run**.
7. Elegir **Functional**, **Local**, una iteración y las **46 solicitudes**, en el orden original. Desactivar **Keep variable values** para no conservar tokens después de terminar.
8. Pulsar **Start run**. Comprobar 234 aserciones aprobadas, cero fallidas y cero errores. Los casos funcionales son 18, no 234.
9. Revisar las solicitudes y sus aserciones dentro del Runner. No publicar tokens aunque sean temporales de prueba.

La colección obtiene automáticamente tokens A/B e IDs de los pedidos creados en esa ejecución. SETUP crea cuatro pedidos de paginación; TC-15 elimina el pedido principal al final y CLEANUP elimina los cuatro datos auxiliares. Si una ejecución se interrumpe, detener API, ejecutar seed e importar nuevamente el ambiente local actualizado. No depende de IDs anteriores.

La colección entregada usa formato v2.1 y se importó realmente en Postman 12.32.4. Newman no ejecuta el formato v3 de Native Git. [Importación oficial](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/).

## Ejecutar mediante CLI

Con la API iniciada y los datos preparados, abrir otra terminal en la raíz:

```powershell
npm test
```

Ejecuta Newman y un validador independiente de intercambios HTTP contra OpenAPI. Devuelve código distinto de cero ante fallos. Guarda un informe sin tokens en evidence/runs/manual.json.

Alternativa de Newman directamente:

```powershell
npx newman run collections/pedidos.postman_collection.json -e .runtime/postman.local.json -r cli
```

La alternativa ejecuta las aserciones de Postman, pero no el validador HTTP adicional de npm test. No exportar reportes completos sin sanitizarlos: pueden contener variables y encabezados con tokens.

## Validación integral desde estado limpio

```powershell
npm run verify
```

No hace falta iniciar manualmente el servidor. El script usa el puerto **3107**, que debe estar libre, y una base aislada .runtime/verification.sqlite. No modifica la base de la demostración gráfica.

Ejecuta baseline, controlled-defect, corrected y clean-repeat. Cada ejecución comienza con datos restablecidos. corrected y clean-repeat son las dos ejecuciones limpias consecutivas finales. La fase defectuosa **debe fallar por el esquema**; verify exige ese fallo y termina correctamente solo si la corrección y las ejecuciones finales pasan.

El script detiene y reinicia su API, restaura la implementación en finally y comprueba que el SHA-256 del contrato permanezca igual. Además crea un pedido, reinicia completamente el proceso con el mismo SQLite y comprueba que el recurso y la sesión persistan. Deja la base de verificación restablecida.

Los informes conservan fechas UTC; el PDF utiliza America/Guatemala. No se suman aserciones de distintas ejecuciones para inflar el resultado.

Se comprobó además una copia limpia del commit con npm ci y npm run verify, sin ambientes ni bases privados preexistentes. Resultado: 18 casos, 46 solicitudes, 234 aprobadas y cero fallidas. Los hashes del código, contrato, colección y lockfile coinciden con la entrega: [verificación de copia limpia](evidence/fresh-checkout.json).

## API y reglas funcionales

| Operación | Comportamiento |
| --- | --- |
| GET /health | Disponibilidad pública. |
| POST /auth/login | Autentica un usuario ficticio y emite una sesión temporal. |
| POST /orders | Crea un pedido propio; 201 y Location. |
| GET /orders?page=1&limit=10 | Lista solo los recursos del usuario autenticado. |
| GET /orders/{id} | Consulta un pedido propio. |
| PUT /orders/{id}/status | Asigna estado de forma idempotente. |
| DELETE /orders/{id} | Elimina un pedido propio; repetir conserva su ausencia. |

Un pedido tiene 1..20 productos, nombre de 1..80 caracteres con algún carácter distinto de espacio, cantidad entera 1..100 y precio entero de 1..1000000 centavos. La moneda es GTQ o USD. Total calculado en el servidor; propietario tomado de la sesión; se rechazan campos adicionales.

Paginación: page entero 1..1000000 y limit 1..50; valores predeterminados 1 y 10. No se aceptan ceros iniciales, parámetros duplicados ni desconocidos. Fuera del rango: data vacío. Sin registros: totalPages=0. Orden ascendente por id.

Los errores tienen la forma {"error":{"code":"...","message":"...","details":[],"requestId":"UUID"}}; X-Request-Id debe coincidir. Se automatizan 400, 401, 403 y 404. El contrato también describe 413, 415 y 500 donde corresponden. El cuerpo JSON admite hasta 32 KB.

Un pedido ajeno existente devuelve 403; uno inexistente devuelve 404. DELETE sobre un id inexistente devuelve 204. La distinción es deliberada y está documentada.

## Idempotencia y validación del contrato

TC-11 cambia pending a confirmed y comprueba version=2. El PUT repetido y el GET posterior deben ser profundamente iguales a la primera respuesta: versión, fecha, productos, importe y propietario sin cambios. Si el estado coincide, la API no vuelve a escribir. TC-15 verifica DELETE repetido y ausencia final.

Se distinguen tres controles:

1. **Documento OpenAPI 3.1:** Swagger Parser valida estructura y referencias. Redocly CLI se ejecutó adicionalmente. npm run validate también compila esquemas con Ajv2020 y revisa cobertura y ambiente sin secretos.
2. **Cuerpos JSON en Postman:** cada respuesta con cuerpo se valida contra el esquema aplicable. Se usa un subconjunto de JSON Schema compatible con el sandbox. Eso no equivale a validar todo OpenAPI.
3. **Intercambios HTTP:** scripts/contract.mjs comprueba método/ruta documentados, código, encabezados, Content-Type, esquema de respuesta con Ajv2020 y entradas/seguridad de solicitudes exitosas. Las negativas violan deliberadamente las entradas. Estas comprobaciones cubren los intercambios observados, no todos los estados posibles ni todas las causas de un error 500.

Lint adicional: npx redocly lint openapi/openapi.json.

[Demostración reproducible del defecto](docs/controlled-defect.md): se serializa temporalmente totalCents como texto. Las aserciones y Ajv detectan el tipo incorrecto aunque los códigos HTTP sean 200/201. Después se restaura Number(...), se reinicia y se repite. El parche defects/total-as-string.patch está **inactivo** en la implementación final. No se cambió el contrato para aceptar el defecto.

## Evidencias y regeneración de documentos

- evidence/runs/*.json: respuestas, aserciones y errores de contrato. accessToken reemplazado por [REDACTED].
- evidence/verification.json: secuencia de validación y restauración del código/contrato.
- evidence/persistence-restart.json: recurso recuperado después del reinicio.
- evidence/screenshots/postman-*.png: ventana real de Postman recortada, sin tokens visibles.
- evidence/screenshot-manifest.json: procedencia y hashes SHA-256 de imágenes.
- evidence/execution-report.html: respuestas sanitizadas y resultados consultables en navegador.
- artifacts/informe-api-postman.docx y .pdf: entrega académica con campos de identificación editables.

npm run evidence regenera las capturas complementarias del informe HTML. Requiere Chrome o indicar BROWSER_PATH con un Chromium instalado. No recrea ni simula las capturas de escritorio.

Para regenerar el DOCX y convertirlo a PDF desde ese archivo fuente:

```powershell
python -m pip install -r requirements-docs.txt
npm run docs
python scripts/convert_report.py
python scripts/review_pdf.py
```

La última orden renderiza todas las páginas en artifacts/pdf-pages/, excluidas de Git, y comprueba tamaño carta, texto e imágenes. Se revisaron visualmente las páginas renderizadas. El documento no usa encabezados, pies de página, leyendas debajo de capturas ni datos personales inventados.

## Seguridad y límites

No se publican SQLite, ambientes locales, contraseñas generadas ni tokens. npm audit --omit=dev no encontró vulnerabilidades en dependencias de la API. Las herramientas de desarrollo de Newman contienen avisos heredados, registrados en evidence/dependency-audit.json. Se conserva el ejecutor verificado; no se aplicaron actualizaciones forzadas que cambiaran su comportamiento. Usar solo las colecciones y datos ficticios de esta práctica.

Demostración local académica, sin despliegue público ni video. El PDF y el DOCX incluyen el nombre y carné proporcionados por el estudiante; se omitieron curso, docente y sección según su instrucción. Antes de entregar, conceder al docente lectura en GitHub. Si se edita el DOCX, convertirlo nuevamente a PDF. No cambiar la visibilidad a pública.

## Estructura

```text
src/           API, SQLite y seguridad
openapi/       Contrato OpenAPI 3.1
collections/   Colección Postman
environments/  Plantilla sin secretos
scripts/       Preparación, pruebas y documentos
docs/          Matriz, decisiones, revisión y referencias
defects/       Parche demostrativo inactivo
evidence/      Ejecuciones sanitizadas y capturas
artifacts/     PDF y DOCX finales
.runtime/      Bases, ambientes y temporales locales; ignorado
```
