const Server = require('./framework/server');
const express = require('express');
const bodyParser = require("body-parser");
const http = require('http');
const logger = require('./framework/logger');
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");

const port = process.argv[2] || 3000
const DEV_SERER_PORT = 9000

const systemApp = express();

systemApp.set("view engine", "ejs");

systemApp.use(bodyParser.urlencoded({ extended: false }));
systemApp.use(bodyParser.json());

systemApp.get('/', function (req, res) {
    res.redirect('/domain');
})

systemApp.use("/domain", domainRouter);
systemApp.use("/domain/paths", pathRouter);

const server = http.createServer(systemApp);
server.listen(DEV_SERER_PORT, function () {
    logger.info(`Admin Server : Start Listening at ${DEV_SERER_PORT}`)
});

Server().init(port);







