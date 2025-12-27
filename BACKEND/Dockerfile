# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
<<<<<<< HEAD
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci
=======
COPY package.json ./
COPY package-lock.json* ./

# Install all dependencies (including devDependencies for build)
# Use npm install which works with or without package-lock.json
RUN npm install
>>>>>>> e17fbb3 (build BE 27/12)

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]

