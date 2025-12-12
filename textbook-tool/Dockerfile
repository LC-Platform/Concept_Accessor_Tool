# Step 1: Build React app
FROM node:18 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Step 2: Serve with Nginx inside the container
FROM nginx:alpine

# Copy React build into Nginx public directory
COPY --from=build /app/build /usr/share/nginx/html

# ⬇️ Copy your custom nginx.conf into the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
