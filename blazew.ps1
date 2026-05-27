#!/usr/bin/env pwsh

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BlazeDir = Join-Path $ScriptDir ".blazebuild"
$BlazeSrcDir = Join-Path $ScriptDir "blazebuild"
$NodeModulesDir = Join-Path $ScriptDir "node_modules"
$BlazeEntry = Join-Path $ScriptDir "node_modules/@onesoftnet/blazebuild/src/main/typescript/main.ts"
$BlazeNodeModulesDir = Join-Path $ScriptDir "blazebuild/node_modules"

$Arch = switch ((Get-CimInstance Win32_Processor).Architecture) {
    9 { "x64" }
    default { "unknown" }
}

if ($Arch -eq "unknown") {
    Write-Error "Unsupported architecture. Only x64 is supported."
    exit 1
}

if (-not (Test-Path $BlazeDir)) {
    New-Item -ItemType Directory -Path $BlazeDir -Force | Out-Null
}

function Debug-Log {
    param (
        [string]$Message
    )

    if ($env:DEBUG -eq "1") {
        Write-Host "$Message"
    }
}

function Get-BlazeProperty {
    param (
        [string]$PropertyName
    )

    $PropertyFile = Join-Path $ScriptDir "blaze/wrapper/blaze_wrapper.properties"

    if (-not (Test-Path $PropertyFile)) {
        Write-Error "blaze_wrapper.properties file not found: $PropertyFile"
        exit 1
    }

    $Properties = Get-Content $PropertyFile | Where-Object { $_ -match '=' }

    foreach ($Property in $Properties) {
        if ($Property -match "^$PropertyName=(.*)$") {
            return $matches[1]
        }
    }

    return $null
}

function Install-Node {
    $Version = Get-BlazeProperty "node.version"
    $SplittedVersion = $Version -split '\.'
    $Major = $SplittedVersion[0]

    $NodePath = Get-Command node -ErrorAction SilentlyContinue

    if ($NodePath) {
        $GlobalInstalledVersion = (& $NodePath --version).Substring(1)
        $SplittedGlobalInstalledVersion = $GlobalInstalledVersion -split '\.'
        $MajorInstalled = $SplittedGlobalInstalledVersion[0]

        Debug-Log "Found Node.js at $($NodePath.Source)"

        if ($MajorInstalled -ge $Major) {
            Debug-Log "Node.js version $GlobalInstalledVersion is already installed globally and meets the required version $Version."
            return $NodePath
        }

        Debug-Log "Node.js version $GlobalInstalledVersion is installed globally, but it does not meet the required version $Version."
        $NodePath = $null
    }

    if (-not $NodePath) {
        $NodePath = Join-Path $BlazeDir "node/node.exe"

        if (Test-Path $NodePath) {
            Debug-Log "Found project local Node.js at $NodePath"

            $LocalInstalledVersion = (& $NodePath --version).Substring(1)
            $SplittedLocalInstalledVersion = $LocalInstalledVersion -split '\.'
            $MajorLocalInstalled = $SplittedLocalInstalledVersion[0]

            if ($MajorLocalInstalled -ge $Major) {
                Debug-Log "Node.js version $LocalInstalledVersion is already installed locally and meets the required version $Version."
                return $NodePath
            }

            Debug-Log "Node.js version $LocalInstalledVersion is installed locally, but it does not meet the required version $Version."
        }

        $NodePath = $null
    }

    if (-not $NodePath) {
        Write-Host "Node.js version $Version is not installed. Installing..."

        $Url = "https://nodejs.org/dist/v$Version/node-v$Version-win-$Arch.zip"
        $ZipPath = Join-Path $BlazeDir "node.zip"
        $NodeDir = Join-Path $BlazeDir "node"

        Invoke-WebRequest -Uri $Url -OutFile $ZipPath

        if (!$?) {
            Write-Error "Failed to download Node.js from $Url"
            exit 1
        }

        Expand-Archive -Path $ZipPath -DestinationPath $BlazeDir -Force

        if (!$?) {
            Write-Error "Failed to extract Node.js from $ZipPath"
            exit 1
        }

        Move-Item -Path (Join-Path $BlazeDir "node-v$Version-win-$Arch") -Destination $NodeDir -Force

        if (!$?) {
            Write-Error "Failed to move Node.js to $NodeDir"
            exit 1
        }

        Remove-Item -Path $ZipPath

        $NodePath = Join-Path $NodeDir "node.exe"
        $InstalledVersion = (& $NodePath --version).Substring(1)

        Write-Host "Node.js version $InstalledVersion installed at $NodePath"
    }

    return $NodePath
}

$NODE_EXE = Install-Node
$env:PATH = "$($BlazeDir)\node;$env:PATH"

$PackageManager = ""

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $PackageManager = "pnpm"
}
elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    $PackageManager = "npm"
}
elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
    $PackageManager = "yarn"
}
elseif (Get-Command bun -ErrorAction SilentlyContinue) {
    $PackageManager = "bun"
}
else {
    Write-Error "No package manager found. Please install one of pnpm, npm, yarn, or bun."
    exit 1
}

if (-not (Test-Path $BlazeEntry)) {
    Write-Host "Creating project dependencies directory..."

    $NodeModulesOSNDir = Join-Path $NodeModulesDir "@onesoftnet"
    $NodeModulesBlazeDir = Join-Path $NodeModulesOSNDir "blazebuild"

    New-Item -ItemType Directory -Path $NodeModulesOSNDir -Force

    if (!$?) {
        Write-Error "Failed to create project dependencies directory."
        exit 1
    }

    New-Item -ItemType SymbolicLink -Path $NodeModulesBlazeDir -Target $BlazeSrcDir

    if (!$?) {
        Write-Error "Failed to create project dependencies directory."
        exit 1
    }

    Debug-Log "Project dependencies directory created successfully."
}

if (-not (Test-Path $BlazeNodeModulesDir)) {
    Write-Host "Installing blazebuild dependencies using $PackageManager..."

    cd "blazebuild"
    & $PackageManager install
    cd ".."

    if (!$?) {
        Write-Error "Failed to install blazebuild dependencies using $PackageManager."
        exit 1
    }

    Debug-Log "Blazebuild dependencies installed successfully."
}

$Process = Start-Process -FilePath $NODE_EXE -ArgumentList "$BlazeEntry $args" -NoNewWindow -PassThru
$Process.WaitForExit()
$ExitCode = $Process.ExitCode
exit $ExitCode
