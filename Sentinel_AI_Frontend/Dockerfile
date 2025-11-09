# Use Node.js for React app
FROM node:18-alpine

WORKDIR /app

# Copy dependency list
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Build the production bundle
RUN npm run build

# Expose frontend port
EXPOSE 3000

# Start the React development server (or serve static build)
CMD ["npm", "start"]
