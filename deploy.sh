#!/bin/bash

# Set variables
SERVER="root@gaia"
CLIENT_REMOTE_PATH="/www/sexshaker.radeksoft.cz"
SERVER_REMOTE_PATH="/root/sexshaker-server"
LOCAL_CLIENT_PATH="./client"
LOCAL_SERVER_PATH="./server"
SERVICE_NAME="sexshaker.service"

# Colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m" # No color

# Step 1: Build the client
echo -e "${GREEN}Building the client...${NC}"
cd $LOCAL_CLIENT_PATH || exit 1
if ! bun run build; then
    echo -e "${RED}Client build failed. Exiting.${NC}"
    exit 1
fi
cd - || exit 1

# Step 2: Transfer client files to the server
echo -e "${GREEN}Deploying client files...${NC}"
rsync -avz --delete "$LOCAL_CLIENT_PATH/dist/" "$SERVER:$CLIENT_REMOTE_PATH"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to deploy client files. Exiting.${NC}"
    exit 1
fi

# Step 3: Transfer server files to the server
echo -e "${GREEN}Deploying server files...${NC}"
rsync -avz --exclude="node_modules" --exclude="storage.json" --exclude=".env" "$LOCAL_SERVER_PATH/" "$SERVER:$SERVER_REMOTE_PATH"
rsync -avz "./functions.ts" "$SERVER:$SERVER_REMOTE_PATH"
ssh $SERVER "sed -i \"s|from '../functions'|from './functions'|\" /root/sexshaker-server/main.ts"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to deploy server files. Exiting.${NC}"
    exit 1
fi

# Step 4: Restart the service on the server
echo -e "${GREEN}Restarting the server service...${NC}"
ssh $SERVER "systemctl restart $SERVICE_NAME"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to restart the service. Check the server logs for details.${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment successful!${NC}"
