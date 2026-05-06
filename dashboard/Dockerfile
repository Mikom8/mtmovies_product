# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets to NGINX serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Add custom NGINX config if needed (or rely on default)
# We need to configure NGINX to fallback to index.html for React Router
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
