#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Tequity Deployment Script ===${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Consider using a non-root user with docker permissions.${NC}"
fi

# Check for required tools
check_requirements() {
    echo -e "\n${GREEN}Checking requirements...${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Installing...${NC}"
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        echo -e "${YELLOW}Please log out and back in for docker group changes to take effect${NC}"
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}Docker Compose is not installed.${NC}"
        echo "Install with: sudo apt install docker-compose-plugin"
        exit 1
    fi

    echo -e "${GREEN}All requirements met!${NC}"
}

# Setup environment
setup_env() {
    echo -e "\n${GREEN}Setting up environment...${NC}"

    if [ ! -f .env.production ]; then
        if [ -f .env.production.example ]; then
            cp .env.production.example .env.production
            echo -e "${YELLOW}Created .env.production from example. Please edit it with your values.${NC}"
            echo -e "${YELLOW}Run: nano .env.production${NC}"
            exit 1
        else
            echo -e "${RED}.env.production.example not found!${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}Environment file exists.${NC}"
}

# Build and start services
deploy() {
    echo -e "\n${GREEN}Building and starting services...${NC}"

    # Use docker compose (v2) or docker-compose (v1)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    $COMPOSE_CMD build --no-cache
    $COMPOSE_CMD up -d

    echo -e "\n${GREEN}Waiting for services to be healthy...${NC}"
    sleep 10

    $COMPOSE_CMD ps

    echo -e "\n${GREEN}Deployment complete!${NC}"
    echo -e "Access your app at: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP')"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    if [ -z "$1" ]; then
        echo -e "${RED}Usage: $0 ssl YOUR_DOMAIN${NC}"
        exit 1
    fi

    DOMAIN=$1
    EMAIL=${2:-"admin@$DOMAIN"}

    echo -e "\n${GREEN}Setting up SSL for $DOMAIN...${NC}"

    # Stop nginx temporarily
    docker compose stop nginx 2>/dev/null || docker-compose stop nginx

    # Get certificate
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        2>/dev/null || \
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN

    echo -e "${YELLOW}Now update nginx/conf.d/app.conf:${NC}"
    echo "1. Replace YOUR_DOMAIN with $DOMAIN"
    echo "2. Uncomment the HTTPS server block"
    echo "3. Comment out the HTTP proxy_pass block"
    echo "4. Uncomment the HTTP redirect"
    echo -e "\nThen run: $0 restart"
}

# Restart services
restart() {
    echo -e "\n${GREEN}Restarting services...${NC}"
    if docker compose version &> /dev/null; then
        docker compose restart
    else
        docker-compose restart
    fi
}

# View logs
logs() {
    SERVICE=${1:-"app"}
    if docker compose version &> /dev/null; then
        docker compose logs -f $SERVICE
    else
        docker-compose logs -f $SERVICE
    fi
}

# Stop services
stop() {
    echo -e "\n${GREEN}Stopping services...${NC}"
    if docker compose version &> /dev/null; then
        docker compose down
    else
        docker-compose down
    fi
}

# Update deployment
update() {
    echo -e "\n${GREEN}Updating deployment...${NC}"
    git pull
    deploy
}

# Show help
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy    Build and start all services (default)"
    echo "  ssl       Setup SSL certificate (usage: $0 ssl DOMAIN [EMAIL])"
    echo "  restart   Restart all services"
    echo "  stop      Stop all services"
    echo "  logs      View logs (usage: $0 logs [service])"
    echo "  update    Pull latest code and redeploy"
    echo "  help      Show this help message"
}

# Main
case "${1:-deploy}" in
    deploy)
        check_requirements
        setup_env
        deploy
        ;;
    ssl)
        setup_ssl $2 $3
        ;;
    restart)
        restart
        ;;
    stop)
        stop
        ;;
    logs)
        logs $2
        ;;
    update)
        update
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
