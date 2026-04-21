#!/bin/bash

# ===== CONFIG =====
PROJECT_NAME="frontend"
BACKEND_URL="http://localhost:8080"

echo "🚀 Creating React + Tailwind project: $PROJECT_NAME"

# ===== CREATE PROJECT =====
npm create vite@latest $PROJECT_NAME -- --template react
cd $PROJECT_NAME

# ===== CONFIG TAILWIND =====
cat <<EOL >tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOL

# ===== INDEX CSS =====
cat <<EOL >src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
EOL

# ===== ENV FILE =====
cat <<EOL >.env
VITE_API_BASE_URL=$BACKEND_URL
EOL

# ===== SAMPLE API SERVICE =====
mkdir -p src/services

cat <<EOL >src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchEvents = async () => {
  const res = await fetch(\`\${API_BASE_URL}/api/events\`);
  return res.json();
};
EOL

# ===== UPDATE APP =====
cat <<EOL >src/App.jsx
import { useEffect, useState } from "react";
import { fetchEvents } from "./services/api";

function App() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchEvents().then(setEvents).catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🎟️ Event List</h1>
      <ul>
        {events.map((e, i) => (
          <li key={i} className="border p-2 mb-2 rounded">
            {e.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
EOL

# ===== DOCKERFILE (PROD) =====
cat <<EOL >Dockerfile
# Build stage
FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOL

# ===== DOCKERFILE DEV =====
cat <<EOL >Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
EOL

# ===== DOCKER COMPOSE DEV =====
cat <<EOL >docker-compose.dev.yml
version: "3.8"

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8080
EOL

# ===== DOCKER COMPOSE PROD =====
cat <<EOL >docker-compose.yml
version: "3.8"

services:
  frontend:
    build: .
    ports:
      - "3000:80"
EOL

echo "✅ React + Tailwind + Docker setup completed!"
echo ""
echo "👉 DEV mode:"
echo "   docker-compose -f docker-compose.dev.yml up"
echo ""
echo "👉 PROD mode:"
echo "   docker-compose up --build"
echo ""
echo "🌐 Frontend: http://localhost:5173 (dev)"
echo "🌐 Frontend: http://localhost:3000 (prod)"
