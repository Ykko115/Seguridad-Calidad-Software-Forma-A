# Bienvenido/a

Este proyecto fue desarrollado para la asignatura ISY1102 - Calidad y seguridad en el desarrollo de software. En este repositorio se incluye un Frontend y Backend asociados al Caso A de la asignatura llamado "Sistema de Gestión Atlas".

Este software permitirá a usuarios registrados (por empresas) gestionar clientes, contratos y documentos asociados, administrar usuarios y roles internos de la empresa, auditar acciones, y garantizar cumplimiento de normativa de protección de datos y estándares de seguridad. Debe ser accesible desde desktop, tablets y móviles, con especial atención a la usabilidad para adultos mayores.

Este proyecto está pensando para ser utilizado de las siguientes maneras:
 - Podrás inicializar el backend y frontend por separado y según tu lo requieras
 - Podrás efectuar análisis de código estático para frontend y backend.
 - Podrás efectuar análisis de código dinámico al levantar ambos servicios.
 - Utilizar docker en lugar de levantar manualmente cada servicio ya que se incluye una imagen para el proyecto completo que inicializa y configura cada elemento del software construido.
 

## Estructura

Abre el proyecto mediante terminal o editor de código de preferencia Visual Studio Code. El software tiene la siguiente estructura de carpetas y archivos
 
```
root
	|/BACKEND
	|/FRONTEND
	|.env
	|.gitignore
	|docker-compose.yml
	|package.json
	|README.md
```
En el archivo `.env` se definen las variables de entorno que utilizará docker al momento de crear las imágenes, por lo que puedes modificarlas en el caso de tener otros servicios corriendo en tu equipo que utilicen los mismos puertos.

1. JWT_SECRET: `0d1d8132f0fde5beabb417b434ff10f1cae8635a461686b0f46ac9c2bbfbd0e8` Llave utilizada para cifrar y generar los tokens de sesión
2. PORT_POSTGRES: `15432` Puerto expuesto que utilizará tu equipo para permitir acceder a la conexión a la base de datos
3. PORT_BACKEND: `4450` Puerto expuesto que utilizará tu equipo para acceder a la API
4. PORT_FRONTEND: `3350` Puerto expuesto que utilizará tu equipo para acceder al cliente - frontend

## Inicialización con Docker
Abre la terminal y situate en la raíz del proyecto y ejecuta el comando:

1. Ejecuta `docker-compose up -d` para levantar todos los servicios
2. El frontend estará disponible en `http://localhost:3350` (o el puerto configurado en .env)
3. El backend estará disponible en `http://localhost:4450` (o el puerto configurado en .env)
4. La base de datos estará disponible para conectarse mediante:
	4.1 Host: `localhost`
	4.2 Port: `15432 `(o el configurado en .env)
	4.3 Database: `atlas`
	4.4 Nombre de usuario: `postgres`
	4.5 Contraseña: `postgres`

## Integración continua (GitHub Actions)
El pipeline `.github/workflows/ci.yml` automatiza la ejecución de todas las suites del
plan de pruebas. Se dispara en cada push a `main`, en cada Pull Request hacia `main` y
manualmente desde la pestaña **Actions** (`workflow_dispatch`).

| Job | Qué ejecuta | Infraestructura |
|-----|-------------|-----------------|
| `backend` | Unitarias + integración + completitud (`npm test`) y cobertura (`npm run test:coverage`) | Node.js 18 |
| `frontend` | Lint (informativo), unitarias, integración MSW y cobertura | Node.js 22 |
| `globales` | `npm run test:globales` (API + PostgreSQL reales) | docker compose (postgres + backend) |
| `e2e` | Suites Selenium de `E2E/` sobre el stack completo | docker compose + Chrome headless |
| `owasp` | Escaneos OWASP ZAP: API scan (OpenAPI), baseline y full scan | docker compose + contenedor ZAP |
| `resumen` | Consolida el resultado y falla si alguna prueba obligatoria falla | — |

- Los jobs `globales`, `e2e` y `owasp` levantan el stack con `docker compose up -d --build`
  y lo apagan al terminar (`docker compose down -v`).
- El escaneo OWASP ZAP es **informativo** (no bloquea el pipeline): los hallazgos `FAIL`/`WARN`
  son esperados en esta app intencionalmente vulnerable. Los reportes quedan como artefactos
  (`owasp-zap-reportes`) y las coberturas en `backend-coverage` y `frontend-coverage`.
- El paso de `lint` del frontend es informativo porque el repositorio mantiene errores de ESLint
  previos ajenos a la automatización.

### Ejecución local equivalente
```bash
# Unitarias + integración
cd BACKEND && npm test && npm run test:coverage
cd ../FRONTEND && npm test && npm run test:integration

# Globales (requiere el stack levantado)
docker compose up -d --build atlas-postgres atlas-backend
cd BACKEND && npm run test:globales

# E2E (requiere el stack completo)
cd E2E && npm test

# OWASP ZAP (requiere el stack completo)
powershell -ExecutionPolicy Bypass -File ZAP\ejecutar-scans.ps1
```