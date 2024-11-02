# Windows PowerShell script for setting up SudoBot

set GIT_REDIRECT_STDERR="2>&1"

Write-Host "=== Setting up SudoBot with Docker ==="

# Reminder to have Discord credentials ready
Write-Host "Please ensure you have the following information from your Discord Developer Portal:"
Write-Host "- Bot Token"
Write-Host "- Client ID"
Write-Host "- Client Secret"
Write-Host "- Home Guild ID (the ID of your Discord server)"
Write-Host ""
Read-Host "Press Enter to continue once you have these credentials ready..."

# Function to check if a command exists
function Command-Exists {
    param([string]$command)
    $exists = Get-Command $command -ErrorAction SilentlyContinue
    return $exists -ne $null
}

# Check for Docker
if (!(Command-Exists "docker")) {
    Write-Host "Error: Docker is not installed. Please install Docker and try again."
    exit 1
}

# Check for Docker Compose
if (!(Command-Exists "docker-compose")) {
    Write-Host "Error: Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
}

# Check for Git
if (!(Command-Exists "git")) {
    Write-Host "Error: Git is not installed. Please install Git and try again."
    exit 11300326435734556722
}

# Clone the repository
Write-Host "Cloning the SudoBot repository..."
git clone https://github.com/onesoft-sudo/sudobot

if (!(Test-Path "./sudobot")) {
    Write-Host "Failed to clone the sudobot repository."
    exit 1
}

Set-Location "./sudobot"

# Prompt for environment variables
Write-Host "Configuring environment variables..."

# Database configuration
$DB_PASSWORD = Read-Host "Enter the database password [default: root]"
if ([string]::IsNullOrEmpty($DB_PASSWORD)) {
    $DB_PASSWORD = "root"
}

$DB_NAME = Read-Host "Enter the database name [default: sudobot]"
if ([string]::IsNullOrEmpty($DB_NAME)) {
    $DB_NAME = "sudobot"
}

$SUDO_PREFIX = Read-Host "Enter the SudoBot prefix [default: /app/storage]"
if ([string]::IsNullOrEmpty($SUDO_PREFIX)) {
    $SUDO_PREFIX = "/app/storage"
}

# Discord bot credentials
do {
    $TOKEN = Read-Host "Enter your Discord Bot Token"
    if ([string]::IsNullOrEmpty($TOKEN)) {
        Write-Host "Bot Token cannot be empty."
    }
} while ([string]::IsNullOrEmpty($TOKEN))

do {
    $CLIENT_ID = Read-Host "Enter your Discord Client ID"
    if ([string]::IsNullOrEmpty($CLIENT_ID)) {
        Write-Host "Client ID cannot be empty."
    }
} while ([string]::IsNullOrEmpty($CLIENT_ID))

do {
    $CLIENT_SECRET = Read-Host "Enter your Discord Client Secret"
    if ([string]::IsNullOrEmpty($CLIENT_SECRET)) {
        Write-Host "Client Secret cannot be empty."
    }
} while ([string]::IsNullOrEmpty($CLIENT_SECRET))

do {
    $HOME_GUILD_ID = Read-Host "Enter your Home Guild ID (Discord Server ID)"
    if ([string]::IsNullOrEmpty($HOME_GUILD_ID)) {
        Write-Host "Home Guild ID cannot be empty."
    }
} while ([string]::IsNullOrEmpty($HOME_GUILD_ID))

# Generate JWT Secret
Write-Host "Generating JWT secret..."
Add-Type -AssemblyName System.Security
$byteArray = New-Object 'System.Byte[]' 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($byteArray)
$JWT_SECRET = [Convert]::ToBase64String($byteArray)

# Create .env.docker file
Write-Host "Creating .env.docker file..."
$envContent = @"
DB_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/${DB_NAME}
SUDO_PREFIX=${SUDO_PREFIX}

TOKEN=${TOKEN}
CLIENT_ID=${CLIENT_ID}
CLIENT_SECRET=${CLIENT_SECRET}
HOME_GUILD_ID=${HOME_GUILD_ID}
JWT_SECRET=${JWT_SECRET}

# Add other environment variables as needed
"@

$envContent | Out-File -FilePath ".env.docker" -Encoding ASCII

Write-Host ".env.docker file created with the following content:"
Get-Content ".env.docker"

# Prepare configuration directory
Write-Host "Setting up the configuration directory..."
New-Item -ItemType Directory -Path "storage" -Force | Out-Null
Copy-Item -Path "config" -Destination "storage" -Recurse -Force

# Build and start SudoBot
Write-Host "Building and starting SudoBot with Docker Compose..."
docker-compose up -d

Write-Host "SudoBot setup is complete. Use 'docker-compose logs -f' to view logs."
