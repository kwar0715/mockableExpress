FROM node:9.0.0

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install bcrypt
RUN npm install
RUN npm rebuild bcrypt --update-binary

COPY . .

EXPOSE 9000

CMD ["sh", "-c", "npm run-script start --port 80"]
