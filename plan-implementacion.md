# Plan de implementación — willay-api

## Parte 1 — Ahora

### Fase 1 — Core del sistema

#### 1.1 — `GET /incidents` — Listado paginado para tabla

- Query params: `page`, `limit`, `status`, `aiStatus`, `type`, `category`, `urgency`, `requiresSupervision`, `startDate`, `endDate`, `search`
- CITIZEN → solo sus incidents. ADMIN/OPERATOR → todos
- Select campos ligeros: `id`, `originalMessage` (truncado a ~120 chars), `type`, `category`, `urgency`, `status`, `aiStatus`, `requiresSupervision`, `createdAt`, `user { name, lastName }`
- Respuesta: `{ data: [...], total, page, limit, totalPages }`

#### 1.2 — `PATCH /incidents/:id/status` — Transiciones con historial

- Roles: ADMIN, OPERATOR
- State machine validada:
  ```
  RECEIVED → IN_REVIEW
  IN_REVIEW → ACCEPTED | REJECTED
  ACCEPTED → ASSIGNED
  ASSIGNED → IN_PROGRESS
  IN_PROGRESS → RESOLVED | REJECTED
  RESOLVED → CLOSED
  REJECTED → CLOSED
  ```
- En transacción Prisma: actualiza `status` + timestamp correspondiente (`reviewedAt`, `acceptedAt`, etc.) + crea `IncidentHistory` con `previousStatus`, `newStatus`, `userId`, `comment` opcional
- DTO: `{ status: IncidentStatus, comment?: string }`

#### 1.3 — Corregir colisión de intentos en `retry-ai`

- En `retryAi()` del service, agregar `prisma.aiLog.deleteMany({ where: { incidentId: id } })` antes de resetear el incidente
- Así el nuevo análisis comienza limpio con attemptNumber 1, 2, 3 sin colisionar

---

### Fase 2 — Administración

#### 2.1 — CRUD de áreas municipales (`/api/v1/municipal-areas`)

- `POST /` — Crear área (ADMIN). DTO: `name`, `description?` (handle P2002)
- `GET /` — Listar todas (ADMIN). Filtro opcional `status`
- `GET /:id` — Detalle (ADMIN)
- `PATCH /:id` — Actualizar (ADMIN). DTO: `name?`, `description?`, `status?`
- `DELETE /:id` — Soft delete (set `status = INACTIVE`). Si ya tiene asignaciones activas, rechazar

#### 2.2 — Asignaciones de incidentes (`/api/v1/incident-assignments`)

- `POST /` — Asignar (ADMIN)
  - DTO: `incidentId`, `areaId`, `operatorId?`, `note?`
  - Valida: incidente existe y está en ACCEPTED, área existe y ACTIVE, operador existe y es OPERATOR
  - En transacción: crea `IncidentAssignment` + actualiza `incident.status = ASSIGNED`, `incident.assignedAt = now` + crea `IncidentHistory`

- `PATCH /:id/status` — Cambiar estado de asignación (ADMIN, OPERATOR del assignment)
  - DTO: `status`, `note?`
  - Transiciones:
    - `ASSIGNED → ACCEPTED` → set `acceptedAt`
    - `ACCEPTED → IN_PROGRESS` → set `startedAt`, y `incident.startedAt = now`, `incident.status = IN_PROGRESS`
    - `IN_PROGRESS → COMPLETED` → set `completedAt`, y `incident.resolvedAt = now`, `incident.status = RESOLVED`
    - `* → CANCELLED` → set `cancelledAt`, y `incident.status = ACCEPTED` (vuelve a disponible)
    - `ASSIGNED | ACCEPTED → REASSIGNED` → marca actual como REASSIGNED, no cambia incident status
    - Cada cambio crea `IncidentHistory`

- `GET /` — Listar asignaciones (ADMIN, OPERATOR). Filtros: `incidentId`, `areaId`, `operatorId`, `status`. Paginado
- `GET /:id` — Detalle (ADMIN, OPERATOR)

---

## Parte 2 — Futuro (no tocar ahora)

| Feature | Notas |
|---------|-------|
| Evidencias | Modelo Prisma `Evidence` con `incidentId`, `fileUrl`, `mimeType`, `createdAt`. Subida de imágenes múltiples |
| Notificaciones | Canal interno + push para React Native/Expo |
| Batch reprocess | `POST /incidents/reprocess` para múltiples |
| Auto-reencolado | Cron para stuck PENDING/ERROR/PROCESSING |
| Respuestas por rol | Mappers con distinta proyección según rol |
