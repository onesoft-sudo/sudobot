#!/bin/bash

echo "=== Setting up SudoBot with Docker ==="

# Reminder to have Discord credentials ready
echo "Please ensure you have the following information from your Discord Developer Portal:"
echo "- Bot Token"
echo "- Client ID"
echo "- Client Secret"
echo "- Home Guild ID (the ID of your Discord server)"
echo ""
echo -n "Press Enter to continue once you have these credentials ready..."
read  # Waits for the user to press Enter

# Function to check if a command exists
command_exists () {
    command -v "$1" >/dev/null 2>&1 ;
}

# Function to install Docker on Debian/Ubuntu
install_docker_debian() {
    echo "Installing Docker on Debian/Ubuntu..."
    sudo apt-get update
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --yes --dearmor -o /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
}

# Function to install Docker on CentOS/RHEL
install_docker_centos() {
    echo "Installing Docker on CentOS/RHEL..."
    sudo yum install -y yum-utils
    sudo yum-config-manager \
        --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo

    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
}

# Function to install Docker Compose (standalone)
install_docker_compose() {
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    # Create a symbolic link if necessary
    sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
}

# Function to install Git
install_git() {
    echo "Installing Git..."
    if command_exists apt-get ; then
        sudo apt-get update
        sudo apt-get install -y git
    elif command_exists yum ; then
        sudo yum install -y git
    else
        echo "Unsupported package manager. Please install Git manually."
        exit 1
    fi
}

# Function to install OpenSSL
install_openssl() {
    echo "Installing OpenSSL..."
    if command_exists apt-get ; then
        sudo apt-get update
        sudo apt-get install -y openssl
    elif command_exists yum ; then
        sudo yum install -y openssl
    else
        echo "Unsupported package manager. Please install OpenSSL manually."
        exit 1
    fi
}

# Check for Docker
if ! command_exists docker ; then
    echo "Docker is not installed."
    echo -n "Docker is required. Would you like to install Docker now? (y/n): "
    read install_docker
    if [ "$install_docker" = "y" ]; then
        if command_exists apt-get ; then
            install_docker_debian
        elif command_exists yum ; then
            install_docker_centos
        else
            echo "Unsupported package manager. Please install Docker manually."
            exit 1
        fi
    else
        echo "Docker is required to continue. Exiting."
        exit 1
    fi
fi

# Check for Docker Compose
if ! command_exists docker-compose ; then
    # Check if docker compose plugin is available
    if docker compose version >/dev/null 2>&1 ; then
        echo "Docker Compose plugin is available."
        alias docker-compose='docker compose'
    else
        echo "Docker Compose is not installed."
        echo -n "Docker Compose is required. Would you like to install Docker Compose now? (y/n): "
        read install_docker_compose
        if [ "$install_docker_compose" = "y" ]; then
            install_docker_compose
        else
            echo "Docker Compose is required to continue. Exiting."
            exit 1
        fi
    fi
fi

# Check for Git
if ! command_exists git ; then
    echo "Git is not installed."
    echo -n "Git is required. Would you like to install Git now? (y/n): "
    read install_git_answer
    if [ "$install_git_answer" = "y" ]; then
        install_git
    else
        echo "Git is required to continue. Exiting."
        exit 1
    fi
fi

# Check for OpenSSL (for JWT secret generation)
if ! command_exists openssl ; then
    echo "OpenSSL is not installed."
    echo -n "OpenSSL is required. Would you like to install OpenSSL now? (y/n): "
    read install_openssl_answer
    if [ "$install_openssl_answer" = "y" ]; then
        install_openssl
    else
        echo "OpenSSL is required to continue. Exiting."
        exit 1
    fi
fi

# Clone the repository
echo "Cloning the SudoBot repository..."
git clone https://github.com/onesoft-sudo/sudobot

cd sudobot || { echo "Failed to enter the sudobot directory."; exit 1; }

# Prompt for environment variables
echo "Configuring environment variables..."

# Database configuration
echo -n "Enter the database password [default: root]: "
read DB_PASSWORD_INPUT
DB_PASSWORD=${DB_PASSWORD_INPUT:-root}

echo -n "Enter the database name [default: sudobot]: "
read DB_NAME_INPUT
DB_NAME=${DB_NAME_INPUT:-sudobot}

echo -n "Enter the SudoBot prefix [default: /app/storage]: "
read SUDO_PREFIX_INPUT
SUDO_PREFIX=${SUDO_PREFIX_INPUT:-/app/storage}

# Discord bot credentials
while [ -z "$TOKEN" ]; do
    echo -n "Enter your Discord Bot Token: "
    read TOKEN
    if [ -z "$TOKEN" ]; then
        echo "Bot Token cannot be empty."
    fi
done

while [ -z "$CLIENT_ID" ]; do
    echo -n "Enter your Discord Client ID: "
    read CLIENT_ID
    if [ -z "$CLIENT_ID" ]; then
        echo "Client ID cannot be empty."
    fi
done

while [ -z "$CLIENT_SECRET" ]; do
    echo -n "Enter your Discord Client Secret: "
    read CLIENT_SECRET
    if [ -z "$CLIENT_SECRET" ]; then
        echo "Client Secret cannot be empty."
    fi
done

while [ -z "$HOME_GUILD_ID" ]; do
    echo -n "Enter your Home Guild ID (Discord Server ID): "
    read HOME_GUILD_ID
    if [ -z "$HOME_GUILD_ID" ]; then
        echo "Home Guild ID cannot be empty."
    fi
done

# Generate JWT Secret
echo "Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)

# Create .env.docker file
echo "Creating .env.docker file..."
cat <<EOT > .env.docker
DB_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/${DB_NAME}
SUDO_PREFIX=${SUDO_PREFIX}

TOKEN=${TOKEN}
CLIENT_ID=${CLIENT_ID}
CLIENT_SECRET=${CLIENT_SECRET}
HOME_GUILD_ID=${HOME_GUILD_ID}
JWT_SECRET=${JWT_SECRET}

# Add other environment variables as needed
EOT

echo ".env.docker file created with the following content:"
cat .env.docker

# Prepare configuration directory
echo "Setting up the configuration directory..."
mkdir -p storage
cp -r config storage/

# Build and start SudoBot
echo "Building and starting SudoBot with Docker Compose..."
docker-compose up -d

echo "SudoBot setup is complete. Use 'docker-compose logs -f' to view logs."
