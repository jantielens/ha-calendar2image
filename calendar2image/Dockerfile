ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js 22 LTS and Chromium for Puppeteer
RUN apk add --no-cache \
    nodejs \
    npm \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    font-noto-cjk && \
    update-ca-certificates

# Set Puppeteer environment variables to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROMIUM_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .puppeteerrc.cjs ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src ./src

# Copy sample files to /app (will be copied to config dir at runtime)
COPY sample-0.json ./sample-0.json
COPY config-sample-README.md ./config-sample-README.md

# Copy s6-overlay service files and init scripts
COPY rootfs /
RUN chmod a+x /etc/services.d/calendar2image/run /etc/services.d/calendar2image/finish /etc/cont-init.d/00-calendar2image.sh

# Expose port (will be overridden by config.yaml)
EXPOSE 3000

# Start via s6-overlay (no explicit CMD needed)
