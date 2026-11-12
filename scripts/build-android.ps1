$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\node_modules")) {
  npm install
}

npm run build

if (-not (Test-Path ".\android")) {
  npx cap add android
}

npx cap sync android

$gradle = ".\android\gradlew.bat"
if (-not (Test-Path $gradle)) {
  throw "Gradle wrapper not found at $gradle"
}

Push-Location ".\android"
try {
  .\gradlew.bat assembleDebug
} finally {
  Pop-Location
}

$apk = ".\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
  Write-Host ""
  Write-Host "APK created: $((Resolve-Path $apk).Path)" -ForegroundColor Green
} else {
  throw "Build finished but APK was not found."
}