const Server= require('./framework/server');
const logger = require('./framework/logger');
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");

const port = process.argv[2] || 3000

Server().app.get('/', function (req, res) {
    res.redirect('/domain');
})

Server().app.use("/domain", domainRouter);
Server().app.use("/domain/paths", pathRouter);

Server().applyDomainList();

Server().app.listen(port);

logger.info(`Start Listening at ${port}`)



