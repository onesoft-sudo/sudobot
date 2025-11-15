#!/usr/bin/env pwsh

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BlazeDir = Join-Path $ScriptDir ".blazebuild"
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

function Install-Bun {
    $Version = Get-BlazeProperty "bun.version"
    $SplittedVersion = $Version -split '\.'
    $Major = $SplittedVersion[0]
    $Minor = $SplittedVersion[1]

    $BunPath = Get-Command bun -ErrorAction SilentlyContinue

    if ($BunPath) {
        $GlobalInstalledVersion = & $BunPath --version
        $SplittedGlobalInstalledVersion = $GlobalInstalledVersion -split '\.'
        $MajorInstalled = $SplittedGlobalInstalledVersion[0]
        $MinorInstalled = $SplittedGlobalInstalledVersion[1]

        Debug-Log "Found Bun at $($BunPath.Source)"

        if ($MajorInstalled -gt $Major) {
            Debug-Log "Bun version $GlobalInstalledVersion is already installed globally and meets the required version $Version."
            return $BunPath
        }

        if ($MajorInstalled -eq $Major -and $MinorInstalled -ge $Minor) {
            Debug-Log "Bun version $GlobalInstalledVersion is already installed globally and meets the required version $Version."
            return $BunPath
        }

        Debug-Log "Bun version $GlobalInstalledVersion is installed globally, but it does not meet the required version $Version."
        $BunPath = $null
    }

    if (-not $BunPath) {
        $LocalBunPath = Join-Path $BlazeDir "bun/bun.exe"

        if (Test-Path $LocalBunPath) {
            Debug-Log "Found project local Bun at $LocalBunPath"

            $LocalInstalledVersion = & $LocalBunPath --version
            $SplittedLocalInstalledVersion = $LocalInstalledVersion -split '\.'
            $MajorLocalInstalled = $SplittedLocalInstalledVersion[0]
            $MinorLocalInstalled = $SplittedLocalInstalledVersion[1]

            if ($MajorLocalInstalled -gt $Major) {
                Debug-Log "Bun version $LocalInstalledVersion is already installed locally and meets the required version $Version."
                return $LocalBunPath
            }

            if ($MajorLocalInstalled -eq $Major -and $MinorLocalInstalled -ge $Minor) {
                Debug-Log "Bun version $LocalInstalledVersion is already installed locally and meets the required version $Version."
                return $LocalBunPath
            }

            Debug-Log "Bun version $LocalInstalledVersion is installed locally, but it does not meet the required version $Version."
        }

        $BunPath = $null
    }

    if (-not $BunPath) {
        Write-Host "Bun version $Version is not installed. Installing..."
        $Url = "https://github.com/oven-sh/bun/releases/latest/download/bun-windows-$Arch.zip"
        $ZipPath = Join-Path $BlazeDir "bun.zip"
        $BunDir = Join-Path $BlazeDir "bun"

        Invoke-WebRequest -Uri $Url -OutFile $ZipPath

        if (!$?) {
            Write-Error "Failed to download Bun from $Url"
            exit 1
        }

        Expand-Archive -Path $ZipPath -DestinationPath $BlazeDir -Force

        if (!$?) {
            Write-Error "Failed to extract Bun from $ZipPath"
            exit 1
        }

        Move-Item -Path (Join-Path $BlazeDir "bun-windows-$Arch") -Destination $BunDir -Force

        if (!$?) {
            Write-Error "Failed to move Bun to $BunDir"
            exit 1
        }

        Remove-Item -Path $ZipPath

        $BunPath = Join-Path $BunDir "bun.exe"
        $InstalledVersion = & $BunPath --version

        Write-Host "Bun version $InstalledVersion installed at $BunPath"
    }

    return $BunPath
}

Install-Node
$BUN_EXE = Install-Bun

$env:PATH = "$($BlazeDir)\node;$($BlazeDir)\bun;$env:PATH"

$PackageManager = ""

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $PackageManager = "pnpm"
}
elseif (Get-Command bun -ErrorAction SilentlyContinue) {
    $PackageManager = "bun"
}
elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    $PackageManager = "npm"
}
elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
    $PackageManager = "yarn"
}
else {
    Write-Error "No package manager found. Please install pnpm, bun, npm, or yarn."
    exit 1
}

if (-not (Test-Path $BlazeEntry)) {
    Write-Host "Installing project dependencies using $PackageManager..."

    & $PackageManager install

    if (!$?) {
        Write-Error "Failed to install project dependencies using $PackageManager."
        exit 1
    }

    Debug-Log "Project dependencies installed successfully."
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

$Process = Start-Process -FilePath $BUN_EXE -ArgumentList "$BlazeEntry $args" -NoNewWindow -PassThru
$Process.WaitForExit()
$ExitCode = $Process.ExitCode
exit $ExitCode
