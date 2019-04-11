const Server = require('./framework/server');
const express = require('express');
const bodyParser = require("body-parser");
const http = require('http');
const logger = require('./framework/logger');
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");
const db = require('./framework/db');

const port = process.argv[2] || 3000
const DEV_SERER_PORT = 9000

const systemApp = express();

systemApp.set("view engine", "ejs");

try {
    db.getAllDomains();
} catch (error) {
    logger.error(`Domains are empty ${error}`)
}
// create Admin User Default
try {
    db.getAllUsers();
} catch (error) {
    db.setUser('user', '12345678', 556677);
}

systemApp.use(bodyParser.urlencoded({ extended: false }));
systemApp.use(bodyParser.json());

systemApp.get('/', function (req, res) {
    res.render('login/login');
})

systemApp.post('/passChange', async function (req, res) { 
    try {
        db.deleteAllUsers();
        db.setUser(req.body.username, req.body.password);
        res.redirect('/domain');
    } catch (error) {
        logger.error(`Update Password Error : ${error}}`)
        res.redirect('/');
    }
})

systemApp.post('/login',  async function (req, res) {
    const user = await db.getUser(req.body.username, req.body.password);
    logger.info(`Logged User : ${JSON.stringify(user)}`)
    if (user.action) {
        if (req.body.username == 'user' && req.body.password == '12345678' && user.userId == 556677) {
            logger.info('Need To Reset Default Password')
            res.render('login/resetPassword', user);
            res.end();
        }
        logger.info(`Logged In : ${user.username}`)
        res.redirect('/domain');
    }
    logger.info(`Not Valid User : ${JSON.stringify(user)}`)
    res.redirect('/')
})

systemApp.use("/domain", domainRouter);
systemApp.use("/domain/paths", pathRouter);

const server = http.createServer(systemApp);
server.listen(DEV_SERER_PORT, function () {
    logger.info(`Admin Server : Start Listening at ${DEV_SERER_PORT}`)
});

Server().init(port);







