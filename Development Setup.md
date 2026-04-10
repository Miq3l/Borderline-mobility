# n8n script to automate the access to LASA mobility website

This projec contains:

- "browserlessTest.js": A nodejs script test which is executed from n8n, to test the connection between n8n and Browserless/Playwright.
- The n8n nodejs file for production. This is WIP:  not created yet.
- This n8n production script will be trigered  by a n8n webhook linked to a Macrodroid app event.
-`deploy-n8n.sh`is a helper bash script to copy files to server, install dependencies, and run a test execution of the nodejs script.

## Current Setup

- Local development machine: edits nodejs script code and runs deploy commands.
- n8n and Borwserles (playwright) services are installed in a remote server, inside docker containers
- To manage the containers in the remote server DOCKGE is being used.
- nodejs and npm installed in remote server DOCKGE containers, not in the remote server host
- "npm ci" command is used to install the npm module dependencies. Using `docker exec. It runs inside the n8n container and creates the node_modules folder in a binded folder.

- Remote server: `192.168.0.43` (user `miq3l`).
- Remote nodejs scripts folder: `/home/miq3l/projects/dockge/n8n-scripts`
- n8n container name: `n8n_server`.
- Browserless container name: `playwright_engine`

- `/home/miq3l/projects/dockge/n8n-scripts` on host is mounted into the n8n container:
-- host: `home/miq3l/projects/dockge/n8n-scriptss`
-- container: `/files/n8n-scripts`

-- Complete DOCKGE "compose.yaml" file:

		Services:
		  n8n:
		    image: n8nio/n8n:latest
		    container_name: n8n_server
		    restart: always
		    ports:
		      - 5678:5678
		    environment:
		      - N8N_ENABLE_EXECUTE_COMMAND=true
		      - N8N_SECURE_COOKIE=false
		      - N8N_BLOCK_SVC_REGISTRATION_EMAIL=true
		      - NODE_FUNCTION_ALLOW_EXTERNAL=playwright-core
		      # This tells n8n to install the package automatically on boot
		      - N8N_BOOT_NPM_MODULES=playwright-core
		      - N8N_CODE_EXECUTION_MODE=own
		      - NODE_OPTIONS=--stack-trace-limit=10
		      - N8N_RUNNERS_INSECURE_MODE=true
		    volumes:
		      - n8n_data:/home/node/.n8n
		      - /home/miq3l/projects/dockge/n8n-scripts:/files/n8n-scripts
		  browserless:
		    image: browserless/chrome:latest
		    container_name: playwright_engine
		    restart: always
		    ports:
		      - 3000:3000
		    environment:
		      - MAX_CONCURRENT_SESSIONS=2 # Limited to 2: ThinkPad RAM
		      - CONNECTION_TIMEOUT=60000
		volumes:
		  n8n_data: null
		networks: {}


- executing inside `n8n_server` can reach `playwright_engine:3000` **if browserless docker sever is running**:
- Both services (`n8n` and `browserless`) are in the same `docker-compose.yaml`.
- Docker Compose puts them on the same internal network (stack).
- The nodejs script connects to `ws://playwright_engine:3000`, and `playwright_engine` is the `browserless` container name/hostname.



## n8n Workflow Usage

A n8n SSH node is being used.
The setup of the n8n SSH node, to execute the nodejs script,is made directly in the n8n GUI.






