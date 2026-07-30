# AGENTS.md

## Propósito

Este archivo define las reglas obligatorias para cualquier agente o persona que
modifique `willay-api`. Antes de trabajar, leer este archivo, `app-description.md`
y el código relacionado con la tarea. No asumir que una función planificada ya
está implementada.

## Regla operativa principal

**No iniciar ni ejecutar el servidor. El usuario se encarga de hacerlo.**

Está prohibido ejecutar:

- `pnpm start`
- `pnpm start:dev`
- `pnpm start:debug`
- `pnpm start:prod`
- Cualquier comando equivalente que ejecute `nest start`, `node dist/main` o
  deje un proceso HTTP, watcher o debugger activo.

Tampoco ejecutar `pnpm test:watch`, porque deja un proceso persistente.

Sí se permite compilar, revisar tipos, ejecutar lint, validar Prisma y correr
pruebas acotadas que no inicien el servidor ni dependan de infraestructura real.

## Comandos de verificación permitidos

- Compilar: `pnpm build`.
- Revisar tipos sin escribir salida: `pnpm exec tsc --noEmit`.
- Lint sin modificar archivos: `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"`.
- Revisar formato: `pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts"`.
- Validar Prisma: `pnpm exec prisma validate`.
- Ejecutar unit tests: `pnpm test -- --runInBand --passWithNoTests`.

El script `pnpm lint` usa `--fix` y modifica archivos. Solo usarlo cuando esos
cambios sean intencionales y después revisar el diff. `pnpm format` también
modifica archivos. `pnpm test:e2e` inicializa la aplicación completa y requiere
PostgreSQL, Redis y variables de IA; no ejecutarlo sin permiso explícito.

## Infraestructura y datos

- No iniciar Docker Compose ni servicios PostgreSQL o Redis sin permiso.
- No ejecutar `prisma migrate`, `prisma db push`, `prisma db seed`, resets ni
  comandos que cambien datos o esquemas reales sin autorización explícita.
- `prisma validate`, generación del cliente y revisión de formato son seguros.
- Revisar siempre el SQL de una migración antes de aplicar cambios destructivos.
- No borrar, truncar ni reemplazar datos para facilitar una prueba.
- Nunca modificar `.env` ni incluir secretos en archivos, logs, pruebas o commits.
- Actualizar `.env.example` cuando se agregue una variable obligatoria.

## Arquitectura del repositorio

- `src/main.ts`: bootstrap, prefijo, versión, CORS, seguridad y pipes globales.
- `src/common`: decoradores, guards, interceptores, interfaces y constantes.
- `src/config`: validación de variables de entorno.
- `src/infrastructure/prisma`: integración de Prisma y PostgreSQL.
- `src/modules`: módulos funcionales de NestJS.
- `prisma/schema.prisma`: fuente de verdad del modelo de datos.
- `prisma/migrations`: historial de cambios de base de datos.
- `test`: pruebas E2E.
- `src/generated/prisma`: código generado; no editar manualmente.

Mantener la arquitectura modular existente. Usar controladores para HTTP,
servicios para reglas de negocio, providers para SDK externos, productores y
procesadores para colas, DTOs para entrada y mappers para respuestas cuando sean
necesarios. No crear abstracciones o archivos sin una necesidad concreta.

## Convenciones de código

- Nombres internos, modelos, rutas, archivos y logs técnicos en inglés.
- Mensajes e interfaz dirigidos al usuario en español.
- Usar `Incident`, nunca `Incidence`.
- Variables y métodos en `camelCase`.
- Clases, tipos, enums y modelos en `PascalCase`.
- Archivos y carpetas en `kebab-case`.
- Constantes y valores de enum en `UPPER_SNAKE_CASE`.
- Evitar `any`; usar `unknown` y validar antes de consumir datos externos.
- Usar inyección de dependencias de NestJS; no instanciar servicios manualmente.
- Reutilizar decoradores, guards, interfaces y servicios existentes.
- Mantener cambios pequeños y enfocados; evitar reescrituras no solicitadas.
- Agregar comentarios solo cuando expliquen una decisión no evidente.

## API y validación

- Conservar prefijo y versionado configurables; normalmente `/api/v1`.
- Conservar el envelope global `{ success, path, timestamp, data }`.
- Validar toda entrada con DTOs y `class-validator`.
- El pipe global elimina y rechaza propiedades no declaradas.
- Usar excepciones NestJS y no filtrar errores internos al cliente.
- Convertir `Decimal` a números solo mediante DTOs o mappers controlados.
- Seleccionar únicamente los campos requeridos; nunca devolver modelos completos
  de `User` si pueden contener información sensible.

## Autenticación, autorización y privacidad

- Proteger rutas privadas con `@Auth(...)` y declarar roles permitidos.
- Obtener identidad y rol del JWT validado; nunca confiar en `userId` o `role`
  enviados por el cliente.
- La autorización por rol no reemplaza la validación de propiedad en servicios.
- Un ciudadano solo puede leer y modificar sus propios recursos permitidos.
- Un operador no obtiene acceso administrativo global por defecto (excepción: puede listar y ver cualquier incidente, al igual que ADMIN).
- Nunca devolver o registrar `passwordHash`, JWT, cookies, API keys, secretos,
  credenciales, DNI completo innecesario ni respuestas sensibles de proveedores.
- Minimizar la exposición de teléfono, correo, identidad y coordenadas.
- Al modificar autenticación, considerar bloqueo y cambios de rol posteriores a
  la emisión del JWT; actualmente existe un riesgo conocido en este punto.

## Reglas de incidentes

- Conservar idempotencia mediante la restricción `(userId, clientRequestId)`.
- Dejar que PostgreSQL aplique unicidad y manejar Prisma `P2002`.
- Guardar el incidente antes de encolar cualquier procesamiento externo.
- Una falla de Redis, BullMQ o IA nunca debe eliminar el reporte.
- Las coordenadas son la fuente principal de ubicación.
- Validar transiciones de estado en el servicio, no solo en el frontend.
- Cada cambio válido de estado debe crear `IncidentHistory`.
- Una reasignación debe conservar la asignación anterior y crear una nueva.
- No eliminar reportes duplicados; preservar cada reporte ciudadano.

## Reglas de IA y colas

- La creación de incidentes no debe esperar una respuesta de IA.
- No llamar proveedores de IA desde controladores ni desde la petición HTTP.
- Mantener BullMQ/Redis y el fallback Cerebras -> Groq -> OpenRouter.
- Validar todas las respuestas externas con Zod antes de persistirlas.
- La IA no inventa hechos ni convierte incertidumbre en certeza.
- La IA es consultiva: nunca rechaza, resuelve o cierra incidentes.
- Si todo falla, conservar el incidente, marcar error y requerir supervisión.
- Registrar intentos en `AiLog` sin exponer información sensible.
- Usar transacciones para actualización, entidades y log de éxito relacionados.
- Todo proveedor externo debe tener timeout y errores normalizados.
- Los job IDs personalizados de BullMQ no deben contener `:`.
- Considerar juntos fallback y reintentos de BullMQ para evitar llamadas excesivas.
- Corregir o evitar colisiones de `(incidentId, attemptNumber)` en reintentos.
- Hacer el procesamiento idempotente y no reprocesar éxitos accidentalmente.
- No llamar APIs de IA reales desde pruebas automatizadas; usar mocks.

## Prisma

- `prisma/schema.prisma` es la fuente de verdad.
- Usar enums generados por Prisma cuando sea práctico.
- Usar transacciones para operaciones relacionadas que deban ser atómicas.
- Manejar errores conocidos como `P2002` y `P2025` de forma explícita.
- Usar `select` para limitar campos y evitar exposición accidental.
- Si cambia el esquema, preparar una migración coherente y regenerar el cliente.
- No editar manualmente archivos en `src/generated/prisma`.
- No añadir modelos futuros hasta implementar la funcionalidad correspondiente.

## Pruebas y calidad

- Agregar o actualizar pruebas al cambiar reglas de negocio.
- Priorizar unit tests con Prisma, colas y proveedores simulados.
- Cubrir propiedad, roles, idempotencia, transiciones y manejo de errores.
- Para IA, cubrir validación, fallback, persistencia de éxito y fallo.
- Para colas, cubrir reintentos, idempotencia y estados atascados.
- No afirmar que una prueba pasó si no se ejecutó.
- Si una verificación requiere infraestructura o servidor, informar al usuario en
  vez de iniciarlos automáticamente.
- La prueba E2E actual está desactualizada; no tomarla como referencia funcional.

## Estado funcional actual

Ya existen registro, perfil, login móvil/web, logout, creación y detalle de
incidentes, persistencia Prisma y clasificación asíncrona con IA.

Los módulos de áreas municipales, asignaciones y notificaciones están registrados
pero vacíos. Tampoco existen todavía listados de incidentes, transición de estados,
reprocesamiento administrativo, evidencias, dashboard ni administración completa.

## Flujo de trabajo esperado

1. Leer los archivos relacionados y confirmar el comportamiento existente.
2. Implementar el cambio mínimo correcto sin romper contratos actuales.
3. Revisar el diff y no modificar trabajo ajeno no relacionado.
4. Ejecutar verificaciones permitidas y acotadas.
5. Informar cambios, verificaciones realizadas y cualquier riesgo pendiente.

Nunca iniciar el servidor como parte de este flujo.
