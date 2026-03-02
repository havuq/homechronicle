# --- Stage 1: grab the pre-built chip-tool binary --------------------------
FROM --platform=linux/amd64 atios/chip-tool:latest AS chiptool

# --- Stage 2: build listener -----------------------------------------------
FROM node:22-slim

# Runtime libs for chip-tool (glib, openssl) + mDNS + native-addon build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libavahi-compat-libdnssd-dev dbus \
    libglib2.0-0 libssl3 \
  && rm -rf /var/lib/apt/lists/*

# chip-tool binary from stage 1
COPY --from=chiptool /usr/local/bin/chip-tool /usr/local/bin/chip-tool

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY src/ ./src/

# Pairing keys and persistent data are volume-mounted at /app/data
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
