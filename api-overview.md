# willay-api — Documentación general

## Parte 1: Endpoints

### Prefijo: `/api/v1`

---

#### Auth — sin autenticación

| Método | Ruta | Body / Cookie | Respuesta |
|--------|------|--------------|-----------|
| `POST` | `/auth/mobile-login` | `{ dni, password }` | `{ accessToken, refreshToken, tokenType, user }` |
| `POST` | `/auth/web-login` | `{ dni, password }` | Setea cookies + `{ user }`. Solo ADMIN/OPERATOR |
| `POST` | `/auth/mobile-refresh` | `{ refreshToken }` | `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/web-refresh` | Cookie refresh | Setea cookies nuevas + `{ user }` |
| `POST` | `/auth/mobile-logout` | `{ refreshToken }` | `{ message }` |
| `POST` | `/auth/web-logout` | Cookie refresh | Limpia cookies + `{ message }` |

---

#### Users — crear público, perfil autenticado

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| `POST` | `/users/create` | ❌ | `{ name, lastName?, dni, password, phone?, email? }` | User creado |
| `GET` | `/users/profile` | ✅ cualquiera | — | Perfil propio |

---

#### Incidents — core

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/incidents` | CITIZEN | Crear incidente (idempotente via `clientRequestId`). Encola IA async |
| `GET` | `/incidents` | CITIZEN, ADMIN, OPERATOR | Listado paginado con filtros: `page`, `limit`, `search`, `status`, `aiStatus`, `type`, `category`, `urgency`, `requiresSupervision`, `startDate`, `endDate`. CITIZEN solo los suyos |
| `GET` | `/incidents/:id` | CITIZEN, ADMIN, OPERATOR | Detalle completo (user, entities, histories, assignments). CITIZEN solo propios |
| `PATCH` | `/incidents/:id/status` | ADMIN, OPERATOR | Transición de estado: RECEIVED→IN_REVIEW, IN_REVIEW→ACCEPTED\|REJECTED, RESOLVED\|REJECTED→CLOSED. Crea `IncidentHistory` |
| `POST` | `/incidents/:id/retry-ai` | ADMIN, OPERATOR | Resetea IA a PENDING, borra AiLogs anteriores, reencola análisis |

---

#### Municipal Areas — solo ADMIN

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/municipal-areas` | Crear área `{ name, description? }` |
| `GET` | `/municipal-areas` | Listar paginado. Filtros: `search`, `status` |
| `GET` | `/municipal-areas/:id` | Detalle |
| `PATCH` | `/municipal-areas/:id` | Actualizar `{ name?, description?, status? }` |
| `DELETE` | `/municipal-areas/:id` | Soft delete (→ INACTIVE). Bloquea si tiene asignaciones activas |

---

#### Incident Assignments — ADMIN y OPERATOR

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/incident-assignments` | ADMIN | Crear asignación `{ incidentId, areaId, operatorId?, note? }`. Incidente debe estar ACCEPTED. Lo pasa a ASSIGNED |
| `PATCH` | `/incident-assignments/:id/status` | ADMIN, OPERATOR (solo suyas) | Transiciones: ASSIGNED→ACCEPTED, ACCEPTED→IN_PROGRESS, IN_PROGRESS→COMPLETED, *→CANCELLED, ASSIGNED\|ACCEPTED→REASSIGNED. Actualiza incidente según corresponda |
| `GET` | `/incident-assignments` | ADMIN, OPERATOR | Listar paginado. Filtros: `incidentId`, `areaId`, `operatorId`, `status` |
| `GET` | `/incident-assignments/:id` | ADMIN, OPERATOR | Detalle con incident, area, operator |

---

## Parte 2: Flujo completo de la app

### Roles

| Rol | Quién | Qué puede hacer |
|-----|-------|----------------|
| **CITIZEN** | Ciudadano de San Jerónimo | Crear incidentes, ver sus incidentes |
| **OPERATOR** | Sereno / trabajador municipal | Ver todos los incidentes, cambiar estados, aceptar/completar asignaciones |
| **ADMIN** | Administrador municipal | CRUD áreas, crear asignaciones, gestionar todo el flujo |

### Flujo paso a paso

```
1. Registro (CITIZEN)
   POST /users/create  → ciudadano se registra con DNI

2. Login
   └─ Mobile (CITIZEN): POST /auth/mobile-login → obtiene accessToken + refreshToken
   └─ Web (ADMIN/OPERATOR): POST /auth/web-login → cookies httpOnly

3. Ciudadano reporta incidente
   POST /incidents  (Authorization: Bearer accessToken)
   Body: { clientRequestId (UUIDv7), originalMessage, lat, lng, address?, addressReference? }

   ┌─ La API:
   │  1. Guarda en PostgreSQL con status=RECEIVED, aiStatus=PENDING
   │  2. Encola trabajo en BullMQ (Redis) para análisis IA
   │  3. Responde 201 con el incidente creado
   │
   └─ El worker (async):
      1. Toma el job de la cola
      2. Marca aiStatus=PROCESSING
      3. Prueba proveedores IA en cadena: Cerebras → Groq → OpenRouter
      4. Si uno funciona: guarda type, category, urgency, sentiment,
         keywords, entities, improvedDescription, recommendedAction
      5. Si todos fallan: aiStatus=ERROR, requiresSupervision=true
      6. Si falla el enqueue: incidente queda PENDING, admin usa retry-ai

4. ADMIN/OPERATOR revisa incidentes nuevos
   GET /incidents?status=RECEIVED&aiStatus=PROCESSED

5. ADMIN/OPERATOR revisa y acepta
   PATCH /incidents/:id/status  → RECEIVED → IN_REVIEW
   PATCH /incidents/:id/status  → IN_REVIEW → ACCEPTED
   (o IN_REVIEW → REJECTED si no corresponde)

6. ADMIN asigna a un área municipal
   POST /incident-assignments
   { incidentId, areaId, operatorId? }
   → Incidente pasa a ASSIGNED, se crea history

7. OPERATOR trabaja la asignación
   PATCH /incident-assignments/:id/status → ASSIGNED → ACCEPTED
   El operador acepta el trabajo

   PATCH /incident-assignments/:id/status → ACCEPTED → IN_PROGRESS
   El operador empieza a atender (incidente → IN_PROGRESS)

   PATCH /incident-assignments/:id/status → IN_PROGRESS → COMPLETED
   Trabajo terminado (incidente → RESOLVED)

8. ADMIN/OPERATOR cierra el incidente
   PATCH /incidents/:id/status → RESOLVED → CLOSED

   ─ O si se cancela ─
   PATCH /incident-assignments/:id/status → { status: "CANCELLED" }
   Incidente vuelve a ACCEPTED, se puede reasignar

9. (Opcional) Si IA falló
   POST /incidents/:id/retry-ai
   → Resetea, borra AiLogs, reencola análisis desde 0

10. Refresh tokens
    Mobile: POST /auth/mobile-refresh (body) cada 15 min
    Web: POST /auth/web-refresh (cookie automática)

11. Logout
    Mobile: POST /auth/mobile-logout (body)
    Web: POST /auth/web-logout (cookie)
```

### Diagrama de estados del incidente

```
                    ┌──────────┐
                    │ RECEIVED │  ← creación ciudadano
                    └────┬─────┘
                         │ PATCH status (ADMIN/OPERATOR)
                         ▼
                    ┌──────────┐
              ┌─────│ IN_REVIEW│─────┐
              │     └────┬─────┘     │
              │          │           │
              ▼          ▼           ▼
        ┌─────────┐ ┌─────────┐ ┌──────────┐
        │ ACCEPTED│ │ REJECTED│ │  CLOSED  │
        └────┬────┘ └────┬────┘ └──────────┘
             │           │
             │ POST      │ PATCH status
             │ assignment│
             ▼           │
        ┌──────────┐     │
        │ ASSIGNED │     │
        └────┬─────┘     │
             │           │
             ▼           │
        ┌────────────┐   │
        │ IN_PROGRESS│   │
        └─────┬──────┘   │
              │          │
        ┌─────┴─────┐    │
        │           │    │
        ▼           ▼    │
   ┌─────────┐ ┌────────┐│
   │ RESOLVED│ │REJECTED││
   └────┬────┘ └───┬────┘│
        │          │     │
        └─────┬────┘     │
              ▼          ▼
         ┌─────────┐
         │  CLOSED │
         └─────────┘
```

---

## Parte 3: Mejoras futuras para la API

### Prioridad alta (próximas)

| Feature | Descripción |
|---------|-------------|
| **Evidencias / fotos** | Modelo Prisma `Evidence` con `incidentId`, `fileUrl`, `mimeType`, `createdAt`. Usar MinIO (SDK S3-compatible). Subir múltiples imágenes por incidente. Endpoints: `POST /incidents/:id/evidences`, `GET /incidents/:id/evidences`, `DELETE /evidences/:id`. No procesar con IA, solo adjuntar. |

### Prioridad media

| Feature | Descripción |
|---------|-------------|
| **Notificaciones** | Módulo de notificaciones funcional. Canal interno (tabla `Notification` en PostgreSQL) + push para React Native/Expo. Notificar al ciudadano cuando su incidente cambia de estado. Notificar al operador cuando se le asigna un incidente |
| **Batch reprocess IA** | `POST /incidents/reprocess` para reencolar múltiples incidentes fallidos a la vez |
| **Reencolado automático** | Cron/scheduled task que cada N minutos busque incidentes stuck en PENDING/ERROR y los reencola automáticamente |

### Prioridad baja (mejoras posteriores)

| Feature | Descripción |
|---------|-------------|
| **Respuestas por rol (mappers)** | DTOs/mappers que devuelvan distinta proyección según el rol (CITIZEN no ve datos internos de asignaciones, operadores, etc.) |
| **Dashboard / estadísticas** | Endpoints para dashboard: count de incidentes por estado, por tipo, por área, gráficos, etc. |
| **User management** | Endpoints ADMIN para listar, bloquear, cambiar rol de usuarios |
| **WebSocket en tiempo real** | Queue de eventos (BullMQ) + WebSocket Gateway para notificar al frontend web cuando llega un nuevo incidente y mostrar alerta con sonido |
| **Geolocalización inversa** | Servicio que convierta lat/lng a dirección usando Nominatim/OSM o Google Maps, para no depender solo de lo que manda el ciudadano |
| **Auditoría completa** | Logs de todas las operaciones administrativas en tabla `AuditLog` |
