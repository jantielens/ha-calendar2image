ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js 22 LTS
RUN apk add --no-cache \
    nodejs \
    npm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src ./src

# Copy sample files to /app (will be copied to config dir at runtime)
COPY sample-0.json ./sample-0.json
COPY config-sample-README.md ./config-sample-README.md

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port (will be overridden by config.yaml)
EXPOSE 3000

# Start the application via entrypoint
CMD ["/entrypoint.sh"]
