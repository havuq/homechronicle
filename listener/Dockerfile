# --- Listener image (matter.js — pure TypeScript, no native binaries) --------
FROM node:22-trixie-slim

# mDNS support for HomeKit discovery (hap-controller uses dns-sd)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libavahi-compat-libdnssd-dev dbus \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY src/ ./src/

# Pairing keys and persistent data are volume-mounted at /app/data
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
