const app = require('./framework/server');
const logger = require('./framework/logger');
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");

const port = process.argv[2]||3000

app.use("/domain", domainRouter);
app.use("/domain/paths", pathRouter);

app.listen(port);

logger.info(`Start Listening at ${port}`)



