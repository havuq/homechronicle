FROM node:20-alpine

# Build tools needed for native addons (hap-controller pulls in @stoprocent/noble
# which requires node-gyp compilation). python3/make/g++ are only used at build time.
# avahi-compat-libdns_sd is needed at runtime for mDNS discovery.
RUN apk add --no-cache python3 make g++ avahi-compat-libdns_sd dbus

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY src/ ./src/

# Pairing keys and persistent data are volume-mounted at /app/data
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
