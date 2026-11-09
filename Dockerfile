# LendWise frontend (React + Vite) for local development.
# Used by docker-compose.yml: runs the Vite dev server with live reload on port 5173.
FROM node:22-alpine

# Run as the image's normal "node" user, not root (safer)
RUN mkdir /app && chown node:node /app
WORKDIR /app
USER node

# Copy only the package files first, then install.
# Docker caches this step, so it re-runs only when package.json or package-lock.json changes.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# Then copy the rest of the code
COPY --chown=node:node . .

EXPOSE 5173
# --host 0.0.0.0 lets the browser on your laptop reach Vite inside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
