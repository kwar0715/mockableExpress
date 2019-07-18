const Server = require("./framework/server");
const express = require("express");
const _ = require("lodash");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const logger = require("./framework/logger");
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");
const uuidv1 = require("uuid/v1");
const db = require("./framework/db");
const { getPublicIP } = require("./framework/utils");
const { send } = require("./framework/emailsender");
const { HOST, API_PORT, FROM_EMAIL, ADMIN_PREFIX } = require("./config");

const port = Number(process.argv[2]) || API_PORT || 3000;

const systemApp = express();

systemApp.set("view engine", "ejs");
systemApp.use(express.static("public"));

systemApp.use(cookieParser());
systemApp.use(
    session({
        key: "userId",
        secret: "aaaa",
        resave: false,
        saveUninitialized: false,
        cookie: {}
    })
);

systemApp.use(bodyParser.json({limit: '50mb'}));
systemApp.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true,
  parameterLimit:50000
}));

// create Admin User Default
try {
    db.getAllUsers();
} catch (error) {
    db.setUser("user", "12345678", "", 556677);
}

// save api url
let apiUrl;
(async() => {
    apiUrl = `http://${HOST ? HOST : await getPublicIP()}:${port}`;
    db.saveApiUrl(apiUrl);
})();

systemApp.use((req, res, next) => {
    if (req.cookies.userId && !req.session.user) {
        res.clearCookie("userId");
    }
    next();
});

const sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.userId) {
        next();
    } else {
        res.redirect(`${ADMIN_PREFIX}`);
    }
};

systemApp.get("/", function(req, res) {
    res.render("login/login", { message: "" });
});

systemApp.get("/requestReset", function(req, res) {
    res.render("login/requestReset");
});

systemApp.post("/requestReset", async function(req, res) {
    try {
        req.session.user = null;
        if (!req.body.username) {
            logger.error("Required Params not found");
            res.redirect(`${ADMIN_PREFIX}`);
        }
        const user = await db.getUserFromUsername(req.body.username);
        const userEmail = user.userEmail;
        if (!userEmail) {
            logger.error(`User email not found ${req.body.username}`);
            res.redirect(`${ADMIN_PREFIX}`);
        }
        const uuid = uuidv1();
        const resetLink = `http://${
            HOST ? HOST : await getPublicIP()
            }/${ADMIN_PREFIX}/resetPassword/${req.body.username}/${uuid}`;
        db.saveResetToken(uuid);
        logger.info(`Email Is Sending to ${userEmail}`);
        const subject = "Reset Your Password (MockableExpress)";
        const text = `
    <h3> Mockable Express Reset Password </h3>
    <br/>
    <p>
    Reset Password : ${resetLink}<br/>
    user name: ${user.username}<br/>
    password: 12345678<br/>
    </p>
    `;
        send({ from: FROM_EMAIL, to: userEmail, subject, text });
        res.render("login/login", {
            message: `Password Reset Link sent to ${userEmail}`
        });
    } catch (error) {
        res.redirect(`${ADMIN_PREFIX}/`);
    }
});

systemApp.get("/resetPassword/:username/:token", async function(req, res) {
    try {
        const token = await db.getResetToken();
        const user = await db.getUserFromUsername(req.params.username);
        if (!user) {
            req.session.user = null;
            res.redirect(`${ADMIN_PREFIX}/`);
        }
        if (req.params.token === token) {
            logger.info("Token matched");
            await db.deleteUsers(user.counter);
            logger.info("Need To Reset Default Password Through Token");
            db.setUser(user.username, "12345678", user.userEmail, 556677);
            db.deleteResetToken();
        }
    } catch (error) {
        logger.error(error);
    }
    res.redirect(`${ADMIN_PREFIX}/`);
});

systemApp.get("/status", sessionChecker, async function(req, res) {
    res.redirect(`${HOST ? HOST : await getPublicIP()}/status`);
});

systemApp.post("/saveToken", function(req, res) {
    db.saveToken(`Bearer ${req.body.id}`);
    res.end();
});

systemApp.get("/logout", function(req, res) {
    req.session.user = null;
    logger.error(`Logging out`);
    res.redirect(`${ADMIN_PREFIX}/`);
});

systemApp.post("/passChange", sessionChecker, async function(req, res) {
    try {
        db.setUser(req.body.username, req.body.password, req.body.userEmail);
        res.redirect(`${ADMIN_PREFIX}/domain`);
    } catch (error) {
        logger.error(`Update Password Error : ${error}}`);
        res.redirect(`${ADMIN_PREFIX}/`);
    }
});

systemApp.post("/login", async function(req, res) {
    try {
        const user = await db.getUser(req.body.username, req.body.password);
        logger.info(`Logged User : ${JSON.stringify(user)}`);
        if (user.action) {
            req.session.user = user;
            if (user.userId == 556677) {
                db.deleteUsers(user.counter - 1);
                logger.info("Need To Reset Default Password");
                res.render(`login/resetPassword`, user);
                res.end();
            }
            logger.info(`Logged In : ${user.username}`);
            res.redirect(`${ADMIN_PREFIX}/domain`);
        }
        logger.info(`Not Valid User : ${JSON.stringify(user)}`);
    } catch (error) {
        logger.error(error);
    }
    res.redirect(`${ADMIN_PREFIX}/`);
});

systemApp.post("/saveEnableUpload", function(req, res) {
    db.setEnableUpload({
        enable: req.body.status
    });
    res.end();
});

systemApp.get("/getEnableUpload", function(req, res) {
    return res.send(db.getEnableUpload());
});

systemApp.post("/flushAll", function(req, res) {
    try {
        db.flushAllUserData();
        res.send({ success: true });
    } catch (error) {
        res.send({ success: false });
    }
});

systemApp.post("/upload", async function(req, res) {
    const isEnable = db.getEnableUpload().enable == "true";
    if (!isEnable) {
        return res.status(401).send("Unauthorized permission to api creation(Enable Upload function)")
    }
    if (!_.isArray(req.body)) {
        return res.status(400).send("Bad Request (Body should contain an array)")
    }
    const result = [];
    for (let i = 0; i < req.body.length; i++) {
        const {
            domainName,
            pathName,
            pathUrl,
            pathDescription,
            pathMethod,
            pathStatus,
            header,
            query,
            body
        } = req.body[i];
        logger.info(`Preparing to upload ... ${JSON.stringify(req.body)}`);
        if (!domainName || !pathName || !pathUrl || !pathMethod || !body) {
            return res
                .status(400)
                .send(
                    "Required Parameters not found (domainName,pathName,pathUrl, pathMethod, body)"
                );
        }
        if (!_.isString(domainName) ||
            !_.isString(pathName) ||
            !_.includes(["get", "post", "put", "delete"], _.toLower(pathMethod))
        ) {
            return res.status(400).send("Invalid Parameter Found");
        }
        let headers = { "Content-Type": "application/json" };
        if (header && _.isObject(header)) {
            headers = Object.assign(headers, header);
        }

        let data = {
            domainName: domainName.startsWith("/") ? domainName : `/${domainName}`,
            pathName: pathName.startsWith("/") ? pathName : `/${pathName}`,
            pathUrl,
            pathDescription: pathDescription || "",
            pathMethod: _.toLower(pathMethod),
            pathStatus: _.isNumber(pathStatus) ? Number.parseInt(pathStatus) : 200,
            header: headers,
            authentication: false,
            query,
            body: _.isObject(body) ? JSON.stringify(body) : body
        };
        logger.info(`Preparing to upload record data... ${JSON.stringify(data)}`);
        try {
            const existedPath = await db.getExistedPathId({
                domainName: data.domainName,
                pathUrl: data.pathUrl,
                pathMethod: data.pathMethod
            });
            let domainId = existedPath.domainId || "";
            let pathId = existedPath.pathId || "";
            if (_.isEmpty(existedPath)) {
                domainId = await db.addDomain(data.domainName);
            }
            /**
             * query:{
             *  parameter:
             *  value:
             *  body
             * }
             */

            if (!pathId) {
                pathId = uuidv1();
                if (data.query) {
                    data = {
                       ...data,
                        body: `#if({{${data.query.parameter}}},=,"${data.query.value}"){${JSON.stringify(data.query.body,null,4)}}endif\n`
                    }
                }
                pathId = await db.addPath(domainId, data);
            } else {
                let body="";
                if (data.query) {
                    const conditions = existedPath.path.body.split('endif');  
                    if(conditions.length<=1){
                        body= body.concat(`#if({{${data.query.parameter}}},=,"${data.query.value}"){${JSON.stringify(data.query.body,null,4)}}endif\n`)
                    }
                    let isUpdated=false;
                    for(let i=0;i<conditions.length-1;i++){
                        const condition = conditions[i];
                        if(condition.split(')')[0].includes(data.query.value)){
                            body= body.concat(`#if({{${data.query.parameter}}},=,"${data.query.value}"){${JSON.stringify(data.query.body,null,4)}}endif\n`)
                            isUpdated=true;
                        }else{
                            body = body.concat(`${conditions[i]}endif\n`)
                        }
                    }
                    if(!isUpdated){
                       body= body.concat(`#if({{${data.query.parameter}}},=,"${data.query.value}"){${JSON.stringify(data.query.body,null,4)}}endif\n`)  
                    }
                }else{
                    body = data.body;
                }
                data.body=body;
                await db.updatePath(domainId, pathId, {
                    ...data,
                    authentication: existedPath.authentication
                });
                // if path existed
                Server().removeRoute(`${data.domainName}${data.pathUrl}`, data.pathMethod);
            }

            Server().createEndpoint(data.domainName, data);
            logger.info(
                `Api created {${data.domainName}${data.pathUrl},domainId:${domainId},pathId:${pathId}}`
            );
            result.push({
                domainId,
                pathId,
                pathUrl: `${data.domainName}${data.pathUrl}`
            })
        } catch (error) {
            logger.error(error);
            result.push({ error });
        }
    }
    res.json(result)
});

systemApp.use("/domain", sessionChecker, domainRouter);
systemApp.use("/domain/paths", sessionChecker, pathRouter);

(async function() {
    await db.createTables();
    Server().app.use(ADMIN_PREFIX, systemApp);
    Server().app.get('/', (req, res) => res.redirect(`${ADMIN_PREFIX}/`))
    await Server().init(port);
})()
.then(() => logger.info("Successfully created api server"))
    .catch(err => logger.error(err));