Write-Host "Starting GeoFieldX Development Server..." -ForegroundColor Green
$env:NODE_ENV = "development"
npx tsx server/index.ts