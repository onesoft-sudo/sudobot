#!/bin/bash

echo "=== Setting up SudoBot without Docker using PM2 ==="

# Reminder to have Discord credentials ready
echo "Please ensure you have the following information from your Discord Developer Portal:"
echo "- Bot Token"
echo "- Client ID"
echo "- Client Secret"
echo "- Home Guild ID (the ID of your Discord server)"
echo "- PostgresSQL Username/Password"
echo "- Postgres Data"
echo ""
echo -n "Press Enter to continue once you have these credentials ready..."
read  # Waits for the user to press Enter

# Function to check if a command exists
command_exists () {
    command -v "$1" >/dev/null 2>&1 ;
}

# Function to install Node.js (v22.x)
install_node() {
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
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

# Function to install PostgreSQL
install_postgresql() {
    echo "Installing PostgreSQL..."
    if command_exists apt-get ; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    elif command_exists yum ; then
        sudo yum install -y postgresql postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
    else
        echo "Unsupported package manager. Please install PostgreSQL manually."
        exit 1
    fi
}

# Function to install PM2
install_pm2() {
    echo "Installing PM2..."
    sudo npm install -g pm2
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

# Check for Node.js
if ! command_exists node ; then
    echo "Node.js is not installed."
    echo -n "Node.js is required. Would you like to install Node.js now? (y/n): "
    read install_node_answer
    if [ "$install_node_answer" = "y" ]; then
        install_node
    else
        echo "Node.js is required to continue. Exiting."
        exit 1
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

# Check for PostgreSQL
if ! command_exists psql ; then
    echo "PostgreSQL is not installed."
    echo -n "PostgreSQL is required. Would you like to install PostgreSQL now? (y/n): "
    read install_postgresql_answer
    if [ "$install_postgresql_answer" = "y" ]; then
        install_postgresql
    else
        echo "PostgreSQL is required to continue. Exiting."
        exit 1
    fi
fi

# Check for PM2
if ! command_exists pm2 ; then
    echo "PM2 is not installed."
    echo -n "PM2 is required. Would you like to install PM2 now? (y/n): "
    read install_pm2_answer
    if [ "$install_pm2_answer" = "y" ]; then
        install_pm2
    else
        echo "PM2 is required to continue. Exiting."
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
echo "Leaving database values default will create a database and user."
# Database configuration
echo -n "Enter the database name [default: sudobot]: "
read DB_NAME_INPUT
DB_NAME=${DB_NAME_INPUT:-sudobot}

echo -n "Enter the database user [default: postgres]: "
read DB_USER_INPUT
DB_USER=${DB_USER_INPUT:-postgres}

echo -n "Enter the database password [default: root]: "
read DB_PASSWORD_INPUT
DB_PASSWORD=${DB_PASSWORD_INPUT:-root}

echo -n "Enter the database host [default: localhost]: "
read DB_HOST_INPUT
DB_HOST=${DB_HOST_INPUT:-localhost}

echo -n "Enter the database port [default: 5432]: "
read DB_PORT_INPUT
DB_PORT=${DB_PORT_INPUT:-5432}

echo -n "Enter the SudoBot storage directory [default: /var/sudobot/storage]: "
read SUDO_PREFIX_INPUT
SUDO_PREFIX=${SUDO_PREFIX_INPUT:-/var/sudobot/storage}

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

# Create the .env file
echo "Creating .env file..."
cat <<EOT > .env
TOKEN=${TOKEN}
CLIENT_ID=${CLIENT_ID}
CLIENT_SECRET=${CLIENT_SECRET}
HOME_GUILD_ID=${HOME_GUILD_ID}
DB_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
SUDO_PREFIX=${SUDO_PREFIX}

# Add other environment variables as needed
EOT

echo ".env file created with the following content:"
cat .env

# Prepare storage directory
echo "Setting up the storage directory..."
sudo mkdir -p "${SUDO_PREFIX}"
sudo chown -R $(whoami):$(whoami) "${SUDO_PREFIX}"
cp -r config "${SUDO_PREFIX}/"

# Build the project using BlazeBuild or your preferred method
echo "Building SudoBot..."
./blazew build

# Set up the database (create user and database)
echo "Setting up the PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
EOF

# Run database migrations
echo "Running database migrations..."
./blazew migrate

# Start SudoBot using PM2
echo "Starting SudoBot using PM2..."
npx pm2 start ecosystem.config.js

# Save PM2 process list and enable startup script
pm2 save
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))

echo "SudoBot setup is complete and running under PM2."
echo "Use 'pm2 logs sudobot' to view logs."
echo "Use 'pm2 status' to check the status of SudoBot."
