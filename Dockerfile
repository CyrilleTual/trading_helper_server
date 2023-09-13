FROM --platform=linux/amd64  node:18-alpine

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

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true\
    LOCAL_PORT=9002\
    DB_HOST='aws.connect.psdb.cloud'\
    DB_NAME=planetdb\
    DB_USER=kugmzatcsgm4zhajqjsq\
    DB_PWD='pscale_pw_mVdMn6HIvmOqfRZBeVqpe9J6HKHY2dDvlc2FjupenLe'\
    DB_PORT=3306\
    TOKEN_SECRET='xF"]U,;Fv@0^~Yvy:zoM[NW121*pgH'\
    SALT=10\
    API_BASE_URL='/api.tradingtool.com/v1'\
    PORT=9002

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 9002

CMD ["node", "/app/src/server.js"]

