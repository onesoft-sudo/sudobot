#!/usr/bin/env powershell

$projectdir = Split-Path -parent $MyInvocation.MyCommand.Definition
$tmp_dir = $projectdir + "/.blaze"
$blazew_dir = $projectdir + "/blaze/wrapper"
$blazew_properties = $blazew_dir + "/blaze_wrapper.properties"
$bun_path = $tmp_dir + "/bun/bin/bun"

enum LogLevel {
    Info
    Warn
    Error
    Debug
}

function Write-Log {
    param (
        [string]$message,
        [LogLevel]$type = [LogLevel]::Info
    )

    if ($type -eq [LogLevel]::Debug -and $env:BLAZEW_DEBUG -ne "1") {
        return
    }

    switch ($type) {
        Info {
            Write-Host "info   " -NoNewline -ForegroundColor Green
            Write-Host "$message"
        }
        Warn {
            Write-Warning "warn   " -NoNewline -ForegroundColor Yellow
            Write-Warning "$message"
        }
        Error {
            Write-Error "error  " -NoNewline -ForegroundColor Red
            Write-Error "$message"
        }
        Debug {
            Write-Verbose "debug  " -NoNewline -ForegroundColor Cyan
            Write-Verbose "$message"
        }
    }
}

if (-not (Test-Path $blazew_properties)) {
    Write-Log "blaze_wrapper.properties file could not be found in $blazew_dir. Are you sure this is BlazeBuild project?"
    exit 1
}

if (-not (Test-Path $tmp_dir)) {
    New-Item -ItemType directory -Path $tmp_dir
}

function Get-BlazeProperty {
    param (
        [string]$property
    )

    $properties = Get-Content $blazew_properties
    $properties | ForEach-Object {
        if ($_ -match "$property=(.*)") {
            $matches[1]
        }
    }
}

function Install-Bun() {
    Write-Log "Installing Bun $bun_version"
    & ([scriptblock]::Create((irm bun.sh/install.ps1))) -Version $bun_version -NoPathUpdate -NoRegisterInstallation -NoCompletions -DownloadWithoutCurl

    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to install Bun $bun_version" Error
        exit 1
    }
}

function Check-Bun() {
    $bun_version = Get-BlazeProperty "bun.version"

    if (-not $bun_version) {
        Write-Log "bun.version property could not be found in $blazew_properties."
        exit 1
    }

    Write-Log "Checking if Bun is already installed" Debug
    
    if (-not (Test-Path $tmp_dir/bun/bin/bun)) {
        Write-Log "Could not find Bun installation"
        Install-Bun
        $current_version = & $bun_path --version
        Write-Log "Installed Bun $current_version"
    }
    else {
        $current_version = & $bun_path --version
        
        if ($current_version -ne $bun_version) {
            Write-Log "Bun $current_version is installed, but required version is $bun_version" Warn
            Write-log "Reinstalling Bun $bun_version" Info
            Remove-Item -Recurse $tmp_dir/bun
            Install-Bun
            $current_version = & $bun_path --version
            Write-Log "Installed Bun $current_version"
        }
        else {
            Write-Log "Bun $current_version is already installed and meets the requirements" Debug
        }
    }
}

Check-Bun

& $bun_path $blazew_dir/blaze_wrapper.js $args
