# Registro de trabajo

## Estado inicial

- Repositorio obligatorio: https://github.com/AugustoReyes21/api-testing-postman
- Visibilidad comprobada: privada.
- Rama principal original: `main`.
- Commit conservado: `f6ca38d12d50bdb10d1d785b7b716d1f38d96414`.
- Árbol de trabajo inicialmente limpio. Existían README, .gitignore y dos carpetas vacías.
- Implementación aislada en la rama `feat/orders-api-automation`.

## Colaboración

Se comprobó `claude --version`, PATH y rutas habituales de instalación de Claude Code en Windows (.local/bin, .claude/local, npm global y WinGet Links). No se encontró un ejecutable. No fue posible iniciar una sesión ni verificar autenticación. No se atribuye a Claude ninguna revisión ni implementación. Codex continúa conforme a la excepción indicada en los requisitos.

La revisión independiente de Claude queda pendiente si se desea incorporarla después de instalar y autenticar su CLI. No se ha instalado ni iniciado sesión en nombre del usuario.

## Aislamiento de cambios concurrentes

Durante la preparación aparecieron archivos .js y una configuración de package.json distintos de las ediciones .mjs de esta tarea. Se preservaron esos cambios y se creó un worktree de Git aislado en `.runtime/worktrees/codex`, sobre la rama `codex/orders-api`, partiendo del commit original de main. La entrega publicada procede de ese worktree; no se mezclaron ni borraron los archivos concurrentes de la carpeta principal.

## Ejecuciones y documentos

- Postman 12.32.4: colección y dos ambientes importados; referencia y corrección con 234 aserciones aprobadas, cero fallidas y cero errores; defecto con 219 aprobadas y 15 fallidas.
- Newman 6.2.3: 18 casos, 46 solicitudes y 234 aserciones; corrección y repetición desde bases limpias aprobadas; persistencia a través de reinicio comprobada.
- La exportación JSON del Runner de Postman requiere un plan adicional en esta instalación. Se conservaron capturas y reportes sanitizados de Newman.
- Word 16.0 estaba disponible y abrió el DOCX. La exportación COM no finalizó; se utilizó una conversión del DOCX a PDF con ReportLab. Se renderizaron y revisaron visualmente las siete páginas finales.
- En la actualización solicitada por el estudiante se incorporaron su nombre y carné al PDF y al DOCX y se eliminó la línea de curso, docente y sección.

## Decisiones

- Express y SQLite integrado de Node.js 24 para evitar compilación de extensiones nativas.
- Credenciales ficticias generadas localmente, fuera de Git. Ambiente de ejemplo sin contraseñas ni tokens.
- PUT de estado: una repetición idéntica conserva versión y fecha de actualización, además del estado.
- Contrato OpenAPI 3.1, comprobación de documento y comprobaciones HTTP independientes de las aserciones de cuerpos JSON de Postman.
- Evidencias basadas en ejecuciones, no en imágenes generadas.

Las horas de los registros de máquina se guardan en UTC. La fecha del informe se presenta en America/Guatemala.
