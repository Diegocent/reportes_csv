# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Install dependencies for the DatePickerWithRange component
RUN npm install date-fns @radix-ui/react-icons react-day-picker

# Disable ESLint during the build process
ENV NEXT_PRIVATE_SKIP_ESLINT=1

# Build the Next.js application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:1.19.0

# Set the working directory in Nginx
WORKDIR /usr/share/nginx/html

# Remove the default Nginx static assets
RUN rm -rf ./*

# Copy built application from builder
COPY --from=builder /app/out .

# Expose port 80 for the application
EXPOSE 8080

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]