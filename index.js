const Server = require("./framework/server");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const http = require("http");
const logger = require("./framework/logger");
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");
const uuidv1 = require("uuid/v1");
const db = require("./framework/db");
const { getPublicIP } = require("./framework/utils");
const { send } = require("./framework/emailsender");
const { HOST, ADMIN_PORT, API_PORT, FROM_EMAIL } = require("./config");

const port = Number(process.argv[2]) || API_PORT || 3000;
const DEV_SERER_PORT = ADMIN_PORT || 9000;

const COOKIE_EXPIRES = 600000;

const systemApp = express();

systemApp.set("view engine", "ejs");
systemApp.use(express.static("public"));

try {
  db.getAllDomains();
} catch (error) {
  logger.error(`Domains are empty ${error}`);
}
// create Admin User Default
try {
  db.getAllUsers();
} catch (error) {
  db.setUser("user", "12345678", "", 556677);
}

// save api url
let apiUrl;
(async () => {
  apiUrl = `http://${HOST ? HOST : await getPublicIP()}:${port}`;
  db.saveApiUrl(apiUrl);
})();

systemApp.use(bodyParser.urlencoded({ extended: false }));
systemApp.use(bodyParser.json());

systemApp.use(cookieParser());
systemApp.use(
  session({
    key: "userId",
    secret: "aaaa",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: COOKIE_EXPIRES
    }
  })
);

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
    res.redirect("/");
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
      res.redirect("/");
    }
    const user = await db.getUserFromUsername(req.body.username);
    const userEmail = user.userEmail;
    if (!userEmail) {
      logger.error(`User email not found ${req.body.username}`);
      res.redirect("/");
    }
    const uuid = uuidv1();
    const resetLink = `http://${
      HOST ? HOST : await getPublicIP()
    }:${DEV_SERER_PORT}/resetPassword/${req.body.username}/${uuid}`;
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
    res.redirect("/");
  }
});

systemApp.get("/resetPassword/:username/:token", async function(req, res) {
  try {
    const token = await db.getResetToken();
    const user = await db.getUserFromUsername(req.params.username);
    if (!user) {
      req.session.user = null;
      res.redirect("/");
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
  res.redirect("/");
});

systemApp.get("/status", sessionChecker, async function(req, res) {
  res.render("status/index", {
    location: `${HOST ? HOST : await getPublicIP()}/status`
  });
});

systemApp.post("/saveToken", function(req, res) {
  db.saveToken(`Bearer ${req.body.id}`);
  res.end();
});

systemApp.get("/logout", function(req, res) {
  req.session.user = null;
  logger.error(`Logging out`);
  res.redirect("/");
});

systemApp.post("/passChange", sessionChecker, async function(req, res) {
  try {
    db.setUser(req.body.username, req.body.password, req.body.userEmail);
    res.redirect("/domain");
  } catch (error) {
    logger.error(`Update Password Error : ${error}}`);
    res.redirect("/");
  }
});

systemApp.post("/login", async function(req, res) {
  try {
    const user = await db.getUser(req.body.username, req.body.password);
    logger.info(`Logged User : ${JSON.stringify(user)}`);
    if (user.action) {
      req.session.user = user;
      if (user.userId == 556677) {
        db.deleteUsers(user.counter);
        logger.info("Need To Reset Default Password");
        res.render("login/resetPassword", user);
        res.end();
      }
      logger.info(`Logged In : ${user.username}`);
      res.redirect("/domain");
    }
    logger.info(`Not Valid User : ${JSON.stringify(user)}`);
  } catch (error) {
    logger.error(error);
  }
  res.redirect("/");
});

systemApp.use("/domain", sessionChecker, domainRouter);
systemApp.use("/domain/paths", sessionChecker, pathRouter);

const server = http.createServer(systemApp);
server.listen(DEV_SERER_PORT, function() {
  logger.info(`Admin Server : Start Listening at ${DEV_SERER_PORT}`);
});

Server().init(port);
