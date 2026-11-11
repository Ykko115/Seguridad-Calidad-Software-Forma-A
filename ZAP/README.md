# Escaneos de seguridad con OWASP ZAP

## Requisitos

- Docker Desktop en ejecución
- Stack levantado: `docker compose up -d` (frontend `:3350`, backend `:4450`)

## Ejecución

```powershell
powershell -ExecutionPolicy Bypass -File ZAP\ejecutar-scans.ps1
```

## Escaneos incluidos

| Reporte | Escaneo | Blanco | Tipo |
|---|---|---|---|
| `api-baseline.html/.json` | `zap-api-scan.py -S` (spec OpenAPI en `/openapi.json`) | API `:4450` | Seguro (sin ataque activo) |
| `baseline-frontend.html/.json` | `zap-baseline.py` (spider tradicional + client spider) | Frontend `:3350` | Pasivo |
| `fullscan-frontend.html/.json` | `zap-full-scan.py` (spider + active scan) | Frontend `:3350` | Activo |

Los reportes se generan en `ZAP/reportes/` (HTML para revisión, JSON como evidencia).

## Códigos de salida

| Código | Significado |
|---|---|
| 0 | Solo reglas en PASS |
| 1 | Hay hallazgos FAIL |
| 2 | Hay hallazgos WARN — comportamiento esperado en esta app |
| 3 | Error de ejecución (el script se detiene) |

## Notas

- Los scans corren desde un contenedor Docker; por eso los blancos usan `host.docker.internal` en lugar de `localhost`.
- El full scan envía payloads de prueba (SQLi, XSS, etc.) contra el frontend: es el comportamiento esperado de ZAP.
- El modo seguro (`-S`) del api-scan evita ataques activos, pero sí envía los ejemplos del spec: quedan filas `John Doe` en `usuarios` y `empresas`. Tras cada corrida, elimínalas:

```powershell
docker exec atlas-postgres psql -U postgres -d atlas -c "DELETE FROM usuarios WHERE nombre_usuario = 'John Doe'" -c "DELETE FROM empresas WHERE nombre = 'John Doe'"
```
