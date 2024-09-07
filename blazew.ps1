#!/usr/bin/env powershell

$blazeDir = (Join-Path (Get-Location) ".blaze").Replace("\", "/")
$blazewDir = (Join-Path (Get-Location) "blaze/wrapper").Replace("\", "/")
$propertiesFile = Join-Path $blazewDir "blaze_wrapper.properties"
$wrapperJSFile = Join-Path $blazewDir "blaze_wrapper.js"
$bunBinDir = Join-Path $blazeDir "bun/bin"
$bunPath = Join-Path $bunBinDir "bun.exe"
$debugMode = $false

if ($env:BLAZEW_DEBUG -eq "1") {
    $debugMode = $true
}

function Debug-Log {
    param([string]$message)

    if ($debugMode) {
        Write-Host "[debug] $message"
    }
}

function Get-Property {
    param([string]$key)

    $value = Get-Content $propertiesFile | Select-String -Pattern "$key=" | ForEach-Object { $_ -replace "$key=" }
    return $value
}

function Start-Blaze {
    if (-not (Test-Path $blazeDir)) {
        Debug-Log "Creating .blaze/ directory"
        New-Item -ItemType Directory -Path $blazeDir | Out-Null
    }
    
    if (-not (Test-Path $blazewDir)) {
        Write-Error "blaze/wrapper/ directory not found. Please run this script from the root of a BlazeBuild project."
        exit 1
    }

    if (-not (Test-Path $propertiesFile)) {
        Write-Error "blaze_wrapper.properties file not found. Please run this script from the root of a BlazeBuild project."
        exit 1
    }
}

# These checks were taken from the Bun installation script.
function Test-Bun {
    $bunRevision = "$(& "${bunPath}" --revision)"

    if ($LASTEXITCODE -eq 1073741795) {
        # STATUS_ILLEGAL_INSTRUCTION  
        Write-Output "Install Failed - bun.exe is not compatible with your CPU. This should have been detected before downloading.`n"
        exit 1
    }
    
    if (($LASTEXITCODE -eq 3221225781) -or ($LASTEXITCODE -eq -1073741515)) {
        # STATUS_DLL_NOT_FOUND 
        Write-Output "Install Failed - You are missing a DLL required to run bun.exe"
        Write-Output "This can be solved by installing the Visual C++ Redistributable from Microsoft:`nSee https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist`nDirect Download -> https://aka.ms/vs/17/release/vc_redist.x64.exe`n`n"
        Write-Output "The command '${bunPath} --revision' exited with code ${LASTEXITCODE}`n"
        exit 1
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Output "Install Failed - could not verify bun.exe"
        Write-Output "The command '${bunPath} --revision' exited with code ${LASTEXITCODE}`n"
        exit 1
    }

    return $bunRevision
}

Start-Blaze

$bunVersion = Get-Property "bun.version"

if (-not $bunVersion) {
    Write-Error "bun.version property not found or is empty in blaze_wrapper.properties file."
    exit 1
}

if (Test-Path $bunPath) {
    Write-Host "Found bun installation at $bunPath"
    Test-Bun

    $version = & $bunPath --version

    if ($version -eq $bunVersion) {
        Write-Host "Bun is up to date"
        # TODO
        exit 0
    }
}

if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) {
    Write-Output "Cannot Install Bun"
    Write-Output "Bun for Windows requires PowerShell 3.0 or later.`n"
    exit 1
}

if (-not ((Get-CimInstance Win32_ComputerSystem)).SystemType -match "x64-based") {
    Write-Output "Cannot Install Bun"
    Write-Output "Bun for Windows is currently only available for x86 64-bit Windows.`n"
    exit 1
}

$bunDownloadURL = "https://github.com/oven-sh/bun/releases/download/bun-v$bunVersion/bun-windows-x64.zip"
$zipPath = Join-Path $blazeDir "bun.zip"

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Write-Host "Downloading Bun from $bunDownloadURL"
Invoke-WebRequest -Uri $bunDownloadURL -OutFile $zipPath

$bunInstallPath = Join-Path $blazeDir "bun"

if (Test-Path $bunInstallPath) {
    Remove-Item -Recurse -Force $bunInstallPath
}

Write-Host "Installing Bun to $bunInstallPath"
Expand-Archive -Path $zipPath -DestinationPath $bunInstallPath
Remove-Item -Force $zipPath
Rename-Item -Path (Join-Path $bunInstallPath "bun-windows-x64") -NewName $bunBinDir

Test-Bun

Write-Host "Bun installed successfully"

# Prepare and execute the BlazeBuild wrapper

if (-not (Test-Path $wrapperJSFile)) {
    Write-Error "blaze_wrapper.js file not found. Please run this script from the root of a BlazeBuild project."
    exit 1
}

$env:Path = "$bunBinDir;$env:Path"

$blazeBuildArgs = $args -join " "
Debug-Log "Executing BlazeBuild with arguments: $blazeBuildArgs"
& $bunPath run $wrapperJSFile $args
exit $LASTEXITCODE