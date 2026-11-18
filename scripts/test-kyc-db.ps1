param([string]$PostgresBin = '', [int]$Port = 55439)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if (!$PostgresBin) { $PostgresBin = Split-Path -Parent (Get-Command psql -ErrorAction Stop).Source }
$runRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot ('.kyc-check/' + [guid]::NewGuid().ToString())))
if (!$runRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Test directory must stay within the repository.'
}
$dataPath = Join-Path $runRoot 'data'
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
$started = $false
$passed = $false
function Invoke-Pg([string]$Executable, [string[]]$Arguments) {
  & (Join-Path $PostgresBin $Executable) @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Executable exited with $LASTEXITCODE" }
}
try {
  Invoke-Pg 'initdb.exe' @('-D', $dataPath, '-A', 'trust', '-U', 'kyc_test', '--encoding=UTF8', '--locale=C', '--no-sync')
  Invoke-Pg 'pg_ctl.exe' @('-D', $dataPath, '-l', (Join-Path $runRoot 'postgres.log'), '-o', "-h 127.0.0.1 -p $Port", '-w', 'start')
  $started = $true
  $connectionArgs = @('-h', '127.0.0.1', '-p', "$Port", '-U', 'kyc_test', '-w')
  Invoke-Pg 'createdb.exe' ($connectionArgs + @('party_link_kyc_test'))
  $files = @('tests/kyc-db-bootstrap.sql', 'supabase/migrations/20261118010000_manual_kyc.sql', 'supabase/migrations/20261118010100_manual_kyc_upload_review.sql', 'supabase/migrations/20261118010200_manual_kyc_tier_caps.sql', 'supabase/migrations/20261118010300_manual_kyc_retention.sql', 'tests/kyc-db.sql')
  foreach ($file in $files) {
    Invoke-Pg 'psql.exe' ($connectionArgs + @('-d', 'party_link_kyc_test', '-v', 'ON_ERROR_STOP=1', '-f', (Join-Path $projectRoot $file)))
  }
  $passed = $true
} finally {
  if ($started) { Invoke-Pg 'pg_ctl.exe' @('-D', $dataPath, '-m', 'immediate', '-w', 'stop') }
  # Validate the absolute deletion target again, using native PowerShell throughout.
  if ($passed -and $runRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $runRoot -Recurse -Force
  }
}
