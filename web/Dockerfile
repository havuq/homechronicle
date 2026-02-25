FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json .
RUN npm install

COPY . .

ARG VITE_API_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Production image: serve the built files with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# LISTENER_HOST default: 127.0.0.1 (NAS host-network mode)
# Override to "listener" when running in bridge mode (local dev via override file)
ENV LISTENER_HOST=127.0.0.1
ENV API_TOKEN=
ENV DOLLAR=$

EXPOSE 80
