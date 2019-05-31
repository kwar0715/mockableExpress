FROM node:8.12.0

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install --save-dev electron-rebuild
RUN npm install bcrypt
RUN npm install

COPY . .

EXPOSE 9000

CMD ["sh", "-c", "npm run-script start --port 80"]
