$reportes = "$PSScriptRoot\reportes"
$imagen = "zaproxy/zap-stable"
$frontend = "http://host.docker.internal:3350"
$apiSpec = "http://host.docker.internal:4450/openapi.json"

New-Item -ItemType Directory -Force $reportes | Out-Null

Write-Output "== ZAP api scan seguro (API :4450) =="
docker run --rm -v "${reportes}:/zap/wrk" -t $imagen zap-api-scan.py -f openapi -t $apiSpec -O http://host.docker.internal:4450 -S -r api-baseline.html -J api-baseline.json
$codigo = $LASTEXITCODE
Write-Output "api-baseline: codigo de salida $codigo"
if ($codigo -eq 3) { exit 3 }

Write-Output "== ZAP baseline (frontend :3350) =="
docker run --rm -v "${reportes}:/zap/wrk" -t $imagen zap-baseline.py -t $frontend -m 2 -j -r baseline-frontend.html -J baseline-frontend.json
$codigo = $LASTEXITCODE
Write-Output "baseline-frontend: codigo de salida $codigo"
if ($codigo -eq 3) { exit 3 }

Write-Output "== ZAP full scan (frontend :3350, activo) =="
docker run --rm -v "${reportes}:/zap/wrk" -t $imagen zap-full-scan.py -t $frontend -m 2 -j -r fullscan-frontend.html -J fullscan-frontend.json
$codigo = $LASTEXITCODE
Write-Output "fullscan-frontend: codigo de salida $codigo"
if ($codigo -eq 3) { exit 3 }

Write-Output "== Escaneos completados =="
