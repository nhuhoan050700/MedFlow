# Run all database migrations (PowerShell)
# Usage: .\database\run-migrations.ps1
# Requires: DATABASE_URL in env, or pass: $env:DATABASE_URL = "postgresql://..."

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $env:DATABASE_URL) {
    Write-Host "Set DATABASE_URL first, e.g.: `$env:DATABASE_URL = 'postgresql://user:pass@host:port/railway'" -ForegroundColor Yellow
    exit 1
}

$migrations = @(
    "001_add_birthday_replace_age.sql",
    "002_add_address.sql",
    "003_generate_queue_number_arr.sql",
    "004_add_test_procedure.sql"
)

foreach ($f in $migrations) {
    $path = Join-Path $PSScriptRoot "migrations" $f
    if (Test-Path $path) {
        Write-Host "Running $f ..."
        & psql $env:DATABASE_URL -f $path
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}
Write-Host "Migrations done."
