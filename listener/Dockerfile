# --- Stage 1: install dependencies (needs build tools for native addons) -----
FROM node:22-trixie-slim AS build

# Build tools for native addons (e.g. @stoprocent/noble via matter.js)
# mDNS/BLE headers needed at compile time
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libavahi-compat-libdnssd-dev \
    libbluetooth-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev

# --- Stage 2: runtime image (no build tools) ---------------------------------
FROM node:22-trixie-slim

# Runtime libs only — mDNS for HomeKit, BLE for matter.js noble
RUN apt-get update && apt-get install -y --no-install-recommends \
    libavahi-compat-libdnssd-dev dbus \
    libbluetooth3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY package.json .
COPY src/ ./src/

# Pairing keys and persistent data are volume-mounted at /app/data
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
