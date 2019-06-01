const Server = require('./framework/server');
const express = require('express');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const session = require('express-session');
const http = require('http');
const logger = require('./framework/logger');
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");
const db = require('./framework/db');
const { getPublicIP } = require('./framework/utils');
const { HOST,ADMIN_PORT, API_PORT} = require('./config');

const port = Number(process.argv[2]) || API_PORT || 3000
const DEV_SERER_PORT = ADMIN_PORT || 9000

const COOKIE_EXPIRES = 600000

const systemApp = express();

systemApp.set("view engine", "ejs");
systemApp.use(express.static('public'))

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

// save api url 
let apiUrl;
(async () => {
    apiUrl = `http://${HOST ? HOST : await getPublicIP()}:${port}`;
    db.saveApiUrl(apiUrl)
})()

systemApp.use(bodyParser.urlencoded({ extended: false }));
systemApp.use(bodyParser.json());

systemApp.use(cookieParser())
systemApp.use(session({
    key: 'userId',
    secret: 'aaaa',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: COOKIE_EXPIRES
    }
}));

systemApp.use((req, res, next) => {
    if (req.cookies.userId && !req.session.user) {
        res.clearCookie('userId');        
    }
    next();
});

const sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.userId) {
        next();
    } else {
        res.redirect('/');
    }    
};

systemApp.get('/', function (req, res) {
    res.render('login/login');
})

systemApp.get('/status', sessionChecker, async function (req, res) {
    res.render('status/index',{location: `${HOST ? HOST : await getPublicIP()}/status`});
})

systemApp.post('/saveToken', function (req, res) {
    db.saveToken(`Bearer ${req.body.id}`)
    res.end();
})

systemApp.get('/logout', function (req, res) {
    req.session.user = null;
    logger.error(`Logging out`)
    res.redirect('/');
})

systemApp.post('/passChange',sessionChecker, async function (req, res) { 
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
        req.session.user = user;
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

systemApp.use("/domain",sessionChecker ,domainRouter);
systemApp.use("/domain/paths", sessionChecker,pathRouter);

const server = http.createServer(systemApp);
server.listen(DEV_SERER_PORT, function () {
    logger.info(`Admin Server : Start Listening at ${DEV_SERER_PORT}`)
});

Server().init(port);







