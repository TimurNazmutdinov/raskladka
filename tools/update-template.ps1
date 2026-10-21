# Встраивает шаблон Excel в приложение: читает файл из папки "Шаблон раскладки" и пишет lib\template.js (base64).
# Запуск: правый щелчок по файлу -> "Выполнить с помощью PowerShell" или из папки проекта: powershell -ExecutionPolicy Bypass -File tools\update-template.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir  = Join-Path $root 'Шаблон раскладки'
$file = Get-ChildItem -Path $dir -Filter '*.xlsx' | Where-Object { $_.Name -notlike '~$*' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $file) { throw "В папке '$dir' нет файла .xlsx" }
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($file.FullName))
$js  = "// Файл создан автоматически скриптом tools\update-template.ps1 из: $($file.Name). Не правьте вручную.`r`nwindow.TEMPLATE_NAME = '$($file.Name)';`r`nwindow.TEMPLATE_B64 = '$b64';`r`n"
[IO.File]::WriteAllText((Join-Path $root 'lib\template.js'), $js, (New-Object Text.UTF8Encoding($false)))
Write-Host "Готово: lib\template.js создан из '$($file.Name)' ($([math]::Round($file.Length/1KB)) КБ)."
