FROM node:20-slim

WORKDIR /app

# Install git and ca-certificates required for npm to resolve git dependencies
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Persisted Baileys auth state (mount a volume here in production).
ENV WA_AUTH_DIR=/app/auth_state
EXPOSE 3001

CMD ["node", "index.js"]
