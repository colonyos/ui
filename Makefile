.PHONY: help container run stop clean logs

# Default target
help:
	@echo "Colony Dashboard - Docker Build Targets"
	@echo ""
	@echo "Available targets:"
	@echo "  make container    - Build the Docker image"
	@echo "  make run          - Run the container (requires env vars)"
	@echo "  make stop         - Stop and remove the container"
	@echo "  make logs         - Show container logs"
	@echo "  make clean        - Remove container and image"
	@echo ""
	@echo "Required environment variables for 'make run':"
	@echo "  COLONY_BACKEND_HOST       - Colony server hostname (for NGINX proxy)"
	@echo "  COLONY_BACKEND_PORT       - Colony server port (default: 50080)"
	@echo "  COLONY_BACKEND_TLS        - Use HTTPS for backend (default: false)"
	@echo "  COLONIES_COLONY_NAME      - Colony name"
	@echo "  COLONIES_SERVER_PRVKEY    - Server private key"
	@echo "  COLONIES_COLONY_PRVKEY    - Colony private key"
	@echo "  COLONIES_PRVKEY           - User private key"
	@echo ""
	@echo "Optional S3 variables (for file browser feature):"
	@echo "  AWS_S3_ENDPOINT           - S3 endpoint URL"
	@echo "  AWS_S3_ACCESSKEY          - S3 access key"
	@echo "  AWS_S3_SECRETKEY          - S3 secret key"
	@echo "  AWS_S3_REGION             - S3 region"
	@echo "  AWS_S3_BUCKET             - S3 bucket name"
	@echo "  AWS_S3_TLS                - Use TLS for S3"
	@echo "  AWS_S3_SKIPVERIFY         - Skip TLS verification"
	@echo ""
	@echo "Example usage:"
	@echo "  make container"
	@echo "  COLONY_BACKEND_HOST=localhost COLONIES_COLONY_NAME=dev ... make run"

# Build Docker image
container:
	docker build -t colony-dashboard .

# Run container (requires environment variables to be set)
run:
	docker run -d \
		--name colony-dashboard \
		--add-host=host.docker.internal:host-gateway \
		-p 80:80 \
		-e COLONY_BACKEND_HOST=host.docker.internal \
		-e COLONY_BACKEND_PORT=$(or $(COLONY_BACKEND_PORT),50080) \
		-e COLONY_BACKEND_TLS=$(or $(COLONY_BACKEND_TLS),false) \
		-e COLONIES_COLONY_NAME=$(COLONIES_COLONY_NAME) \
		-e COLONIES_SERVER_PRVKEY=$(COLONIES_SERVER_PRVKEY) \
		-e COLONIES_COLONY_PRVKEY=$(COLONIES_COLONY_PRVKEY) \
		-e COLONIES_PRVKEY=$(COLONIES_PRVKEY) \
		$(if $(AWS_S3_ENDPOINT),-e AWS_S3_ENDPOINT=$(AWS_S3_ENDPOINT),) \
		$(if $(AWS_S3_ACCESSKEY),-e AWS_S3_ACCESSKEY=$(AWS_S3_ACCESSKEY),) \
		$(if $(AWS_S3_SECRETKEY),-e AWS_S3_SECRETKEY=$(AWS_S3_SECRETKEY),) \
		$(if $(AWS_S3_REGION),-e AWS_S3_REGION=$(AWS_S3_REGION),) \
		$(if $(AWS_S3_BUCKET),-e AWS_S3_BUCKET=$(AWS_S3_BUCKET),) \
		$(if $(AWS_S3_TLS),-e AWS_S3_TLS=$(AWS_S3_TLS),) \
		$(if $(AWS_S3_SKIPVERIFY),-e AWS_S3_SKIPVERIFY=$(AWS_S3_SKIPVERIFY),) \
		colony-dashboard
	@echo "Access at http://localhost"

# Stop and remove container
stop:
	@docker stop colony-dashboard 2>/dev/null || true
	@docker rm colony-dashboard 2>/dev/null || true

# Show logs
logs:
	docker logs -f colony-dashboard

# Clean up everything
clean: stop
	@docker rmi colony-dashboard 2>/dev/null || true
