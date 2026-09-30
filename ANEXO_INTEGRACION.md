# ANEXO — Pruebas de integración (plan de pruebas EP1, sección 3.2)

Jornadas entre módulos con Supertest + `jest.mock` de la capa de datos
(estrategia 3.1.2/3.4.3: sin BD real). Ejecución: `npm run test:integration`
en `BACKEND` (también incluidas en `npm test`).

| ID | Tipo (informe) | Caso | CP | Ubicación |
|----|----------------|------|----|-----------|
| IT-01 | 3.2.4 Integración | Registro `POST /empresas` → login → JWT válido con payload completo | CP-01, CP-04 | `BACKEND/tests/integracion_api.test.js:32` |
| IT-02 | 3.2.2 Seguridad | Login con contraseña incorrecta → 401 sin token | CP-02 | `BACKEND/tests/integracion_api.test.js:80` |
| IT-03 | 3.2.2 Seguridad | Endpoints protegidos sin token → 401 (`/usuarios`, `/contratos/estados`, `POST /clientes`) | CP-03 | `BACKEND/tests/integracion_api.test.js:94` |
| IT-04 | 3.2.4 Integración | Jornada cliente → contrato con PDF → estados → descarga del archivo; verifica `empresa_id` del token y registro en auditoría | CP-06, CP-07, CP-08 | `BACKEND/tests/integracion_api.test.js:108` |
| IT-05 | 3.2.1 Funcionales | `GET /contratos/dashboard` devuelve estadísticas numéricas de la empresa | CP-09 | `BACKEND/tests/integracion_api.test.js:187` |
| IT-06 | 3.2.1 Funcionales | Registrar y listar logs de auditoría | CP-10 | `BACKEND/tests/integracion_api.test.js:206` |

**Resultado:** 12 suites, 202 tests, todo pasando (123 unitarios por módulo
+ 6 integración + 20 completitud + 53 completitud 2). Cobertura: **100%
statements, 100% branches, 100% functions, 100% lines** en todos los
archivos de `src/`.

## Frontend — 24 pruebas en `FRONTEND/src/__tests__/integration/`

Componentes, `AuthProvider`, axios + interceptor, `localStorage` y Toaster
REALES; solo la red HTTP es simulada con MSW (`src/test/integrationServer.js`)
usando los mismos contratos que la API Express. Ejecución:
`npm run test:integration` en `FRONTEND` (config `jest.integration.config.cjs`,
excluidas de `npm test` que sigue siendo solo unitarias: 19 suites, 120 tests).

### Tipo 3.2.1 Pruebas funcionales — `funcionales.test.jsx`

| ID | Caso | Ubicación |
|----|------|-----------|
| F-01 | Login con credenciales válidas navega a `/home` y muestra métricas | `funcionales.test.jsx:26` |
| F-02 | Registro en 2 pasos crea la cuenta y navega a `/login` | `funcionales.test.jsx:43` |
| F-03 | Crear cliente desde la pestaña y verlo en el listado | `funcionales.test.jsx:86` |
| F-04 | Crear contrato con archivo y verlo en el listado (verifica `FormData`: título, `cliente_id` y PDF) | `funcionales.test.jsx:116` |
| F-05 | Navegación entre Inicio, Clientes y Contratos desde el menú | `funcionales.test.jsx:166` |

### Tipo 3.2.2 Pruebas de seguridad — `seguridad.test.jsx`

| ID | Caso | Ubicación |
|----|------|-----------|
| S-01 | Sin token, `/home` redirige a `/login` | `seguridad.test.jsx:11` |
| S-02 | Login con credenciales inválidas no inicia sesión (toast + sin token) | `seguridad.test.jsx:18` |
| S-03 | `RoleGuard` bloquea `/clientes/nuevo` para rol editor | `seguridad.test.jsx:34` |
| S-04 | API protegida con token inválido no entrega datos | `seguridad.test.jsx:42` |

### Tipo 3.2.3 Pruebas de autorización — `autorizacion.test.jsx`

| ID | Caso | Ubicación |
|----|------|-----------|
| A-01 | El menú muestra Usuarios solo para administrador | `autorizacion.test.jsx:26` |
| A-02 | La pestaña Crear Cliente solo existe para administrador | `autorizacion.test.jsx:47` |
| A-03 | Editor no puede crear cliente (sin `POST` a la API) | `autorizacion.test.jsx:68` |
| A-04 | Rutas de administración bloqueadas para editor (`/contratos/nuevo`, `/usuarios`) | `autorizacion.test.jsx:85` |

### Tipo 3.2.4 Pruebas de integración — `integracion.test.jsx`

| ID | Caso | Ubicación |
|----|------|-----------|
| I-01 | Jornada autenticación: registro → login → home con sesión persistida (`token`/`user`/`role` en `localStorage`) | `integracion.test.jsx:25` |
| I-02 | Jornada negocio: crear cliente → crear contrato → eliminar con confirmación + registro en auditoría | `integracion.test.jsx:75` |
| I-03 | Logout limpia la sesión y protege las rutas | `integracion.test.jsx:157` |

### Tipo 3.2.5 Pruebas de usabilidad — `usabilidad.test.jsx`

| ID | Caso | Ubicación |
|----|------|-----------|
| U-01 | `ClienteForm` vacío muestra error y no envía nada | `usabilidad.test.jsx:13` |
| U-02 | `ContratoForm` vacío muestra error y no envía nada | `usabilidad.test.jsx:25` |
| U-03 | Cancelar en `ClienteForm` vuelve al listado | `usabilidad.test.jsx:37` |
| U-04 | Cancelar el diálogo de eliminar no borra el contrato | `usabilidad.test.jsx:51` |

### Tipo 3.2.6 Pruebas no funcionales — `nofuncionales.test.jsx`

| ID | Caso | Ubicación |
|----|------|-----------|
| N-01 | Error 500 en login muestra notificación y no navega | `nofuncionales.test.jsx:14` |
| N-02 | Error 500 en `GET /clientes` no rompe la interfaz | `nofuncionales.test.jsx:38` |
| N-03 | Home muestra estado de carga antes de las métricas | `nofuncionales.test.jsx:58` |
| N-04 | Eliminar contrato muestra notificación de éxito | `nofuncionales.test.jsx:65` |

**Resultado:** 6 suites, 24 tests, todo pasando.

## Completitud backend — `BACKEND/tests/completitud.test.js`

Ramas no alcanzadas por las suites por módulo (token malformado, `PUT`
por campo, auditoría sin sesión y rechazos no-Error). Se ejecuta con
`npm test` y con `npm run test:integration` junto a `integracion_api`.

| Grupo | Casos | Tipo (informe) |
|-------|-------|----------------|
| Token malformado → 401 (`GET /contratos/estados`, `POST /clientes`, `GET /usuarios`, `DELETE /clientes/1`) | 4 | 3.2.2 Seguridad |
| `PUT /contratos/:id` por campo (`cliente_id`, `descripcion`, fechas) y con archivo nuevo | 4 | 3.2.1 Funcionales |
| Operaciones auditadas sin sesión registran usuario `null` (`POST /roles`, `PUT /usuarios/1`, `PUT /empresas/1`) | 3 | 3.2.3 Autorización |
| Rechazos no-Error de la BD → 500 con glosa (uno por módulo: auth, usuarios, clientes, contratos, auditoría, empresas, roles, empresa-usuarios, métricas) | 9 | 3.2.6 No funcionales |

## Completitud backend 2 — `BACKEND/tests/completitud2.test.js` (53 pruebas)

Cierra las ramas restantes hasta el 100%: auditoría con token sin
`nombreUsuario` (`PUT`/`DELETE` de usuarios, contratos, clientes, roles,
empresas y vínculos), rechazo plano por endpoint (todos los `GET`/`PUT`/
`DELETE` de los 9 módulos), token malformado en empresa-usuarios, empresas,
roles y métricas, búsqueda sin parámetro y rutas base (`/`, `/openapi.json`).

## Completitud frontend (unitarias) — 6 suites nuevas

Cubren los componentes que no tenían pruebas: `AuditoriaList`,
`EmpresaForm`, `ContratoDetalle`, `UsuariosList`, `UsuariosTabList` y
`UsuariosTabCreate`. Se ejecutan con `npm test`.

| Suite | Casos | Ubicación |
|-------|-------|-----------|
| `AuditoriaList` (título, `GET /auditoria`, filas, vacío) | 4 | `FRONTEND/src/pages/auditoria/__tests__/AuditoriaList.test.jsx` |
| `EmpresaForm` (carga, validación, actualización total, error de carga, volver/cancelar) | 6 | `FRONTEND/src/pages/empresas/__tests__/EmpresaForm.test.jsx` |
| `ContratoDetalle` (detalle, link de descarga, eliminar admin, sin botón para editor, carga) | 7 | `FRONTEND/src/pages/contratos/__tests__/ContratoDetalle.test.jsx` |
| `UsuariosList` (tabs por rol, `GET /empresa-usuarios`, crear, eliminar con confirmación) | 6 | `FRONTEND/src/pages/usuarios/__tests__/UsuariosList.test.jsx` |
| `UsuariosTabList` (filas, roles, botones admin, solo lectura, editar, eliminar confirmar/cancelar) | 7 | `FRONTEND/src/pages/usuarios/__tests__/UsuariosTabList.test.jsx` |
| `UsuariosTabCreate` (formulario, crear con rol, rol por defecto) | 3 | `FRONTEND/src/pages/usuarios/__tests__/UsuariosTabCreate.test.jsx` |

**Resultado unitarias frontend:** 25 suites, 153 tests, todo pasando.
Cobertura: 92.05% statements, 81.01% branches, 90.62% functions.

Hallazgo documentado: `UsuariosTabCreate.onCreate` no tiene manejo de
error (sin `try/catch` ni toast de fallo); un rechazo de la API queda como
promesa sin manejar.

## Notas técnicas (para la sección 3.4 del informe)

- Herramientas nuevas: `msw@2.0.14` (mock de red) y `undici` (globales `fetch`
  en jsdom), solo como `devDependencies` del frontend.
- `jest.integration.config.cjs`: `customExportConditions: ['node']` (MSW usa
  sus builds de Node), `setupFiles` propio con polyfills y `testMatch` solo
  para `src/__tests__/integration/`.
- Limitación documentada del entorno: el puente XHR de jsdom no preserva los
  bytes multipart hasta MSW. El `POST /contratos` viaja por el axios,
  interceptor y `FormData` reales; el test observa ese `FormData` mediante el
  `transformRequest` de axios (sin mocks) y el handler MSW lo usa para
  responder 201. Los campos (`titulo`, `cliente_id`, fechas) y el archivo
  (`contrato.pdf`) se verifican desde el objeto real construido por el
  componente (prueba F-04).
- Salida limpia: `setup.integration.js` filtra los avisos `act(...)` de
  temporizadores internos de MUI (TouchRipple/Transition/Modal, ruido de
  jsdom, no errores de la app); el 500 intencional de N-02 silencia el
  `console.error` esperado del componente; el script usa `--runInBand
  --forceExit` por un handle `MESSAGEPORT` que MSW deja abierto al importar.
