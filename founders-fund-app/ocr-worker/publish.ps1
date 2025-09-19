param(
  [string]$ImageName = "ocr-worker:local",
  [string]$Registry = "ghcr.io/${env:USERNAME}/ocr-worker"
)

docker build -t $ImageName .
docker tag $ImageName $Registry:latest
docker push $Registry:latest

Write-Host "Pushed $Registry:latest"
