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

# Expose port (will be overridden by config.yaml)
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]
