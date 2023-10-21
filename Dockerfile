#-> for Koyeb or other linux system
FROM --platform=linux/amd64  node:18-alpine   
#-> for MacOs       
# FROM node:lts-alpine                                

WORKDIR /app

RUN apk update && apk add --no-cache nmap && \
    echo @edge https://dl-cdn.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge https://dl-cdn.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk update && \
    apk add --no-cache \
      chromium \
      harfbuzz \
      "freetype>2.8" \
      ttf-freefont \
      nss

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 9002

CMD ["node", "/app/src/server.js"]
