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

# Copy s6-overlay service files
COPY rootfs /
RUN chmod a+x /etc/services.d/calendar2image/run /etc/services.d/calendar2image/finish

# Expose port (will be overridden by config.yaml)
EXPOSE 3000

# Start via s6-overlay (no explicit CMD needed)
