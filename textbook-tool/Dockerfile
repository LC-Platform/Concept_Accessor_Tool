dockerfile lo kuda mention cheyali. ee file refer chey

# Step 1: Build with Node
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG REACT_APP_BASE_PATH="/chatbotiframefestage/"
ENV PUBLIC_URL=$REACT_APP_BASE_PATH

RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html/chatbotiframefestage

# Expose the port
EXPOSE 5173

# Configure Nginx
RUN echo "server { \
    listen 5173; \
    server_name localhost; \
    root /usr/share/nginx/html/chatbotiframefestage; \
    index index.html; \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]