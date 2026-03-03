# --- Stage 1: grab the pre-built chip-tool binary --------------------------
FROM --platform=linux/amd64 atios/chip-tool:latest AS chiptool

# --- Stage 1b: grab Docker CLI for Matter commissioning via host network ---
FROM docker:cli AS dockercli

# --- Stage 2: build listener -----------------------------------------------
FROM node:22-trixie-slim

# Runtime libs for chip-tool (glib, openssl) + mDNS + native-addon build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libavahi-compat-libdnssd-dev dbus \
    libglib2.0-0 libssl3 \
  && rm -rf /var/lib/apt/lists/*

# chip-tool binary from stage 1
COPY --from=chiptool /usr/local/bin/chip-tool /usr/local/bin/chip-tool

# Docker CLI for running chip-tool in a host-networked container (Matter mDNS)
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY src/ ./src/

# Pairing keys and persistent data are volume-mounted at /app/data
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
