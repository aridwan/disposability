# Use the Node.js LTS image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the app's source code
COPY . .

# Expose the application port
EXPOSE 3000

# Command to start the application
CMD ["npm", "start"]
