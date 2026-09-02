FROM node:18-slim WORKDIR /app COPY package.json package-lock.json* ./ RUN if [ -f package-lock.json ]; then
npm ci --only=production --no-audit --no-fund;
else
npm install --production --no-audit --no-fund;
fi COPY . . EXPOSE 4000 CMD ["node","index.js"]
