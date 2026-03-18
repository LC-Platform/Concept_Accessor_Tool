# Step 1: Build with Node
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG REACT_APP_BASE_PATH="/bioereaderfe/"
ENV PUBLIC_URL=$REACT_APP_BASE_PATH

RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html/bioereaderfe

# Expose the port
EXPOSE 3003

# Configure Nginx
RUN echo "server { \
    listen 3003; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /bioereaderfe/ { \
        try_files \$uri \$uri/ /bioereaderfe/index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
