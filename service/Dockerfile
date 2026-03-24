FROM node:20-slim

WORKDIR /app

# Install system dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Shared files for mockup
RUN npm run sync:shared

ENV PORT=3000
ENV DB_PATH=/data/streaks.db

EXPOSE 3000

CMD ["npm", "run", "start:combined"]
