const express = require("express");
const bodyParser = require("body-parser");
const JsonDB = require("node-json-db");
const removeRoute = require("express-remove-route");
const domainRouter = require("./routes/domainRouter");
const pathRouter = require("./routes/pathRoutes");

const { Config } = require("node-json-db/dist/lib/JsonDBConfig");
const app = express();
app.set("view engine", "ejs");
const router = express.Router();

var db = new JsonDB(new Config("resource/database/jsonStore", true, false));

const DOMAIN = "/domain";

//ReApply();

router.get("/", function(req, res) {
  try {
    const data = db.getData("/endpoints");
    res.render("index", { endpoints: data });
  } catch (error) {
    res.render("index", { endpoints: null });
  }
});

function _findRoute(path, stack) {
  var count = 0;
  var routes = [];
  stack.forEach(function(layer) {
    if (!layer) return;
    if (layer && !layer.match(path)) return;
    if (["query", "expressInit"].indexOf(layer.name) != -1) return;
    if (layer.name == "router") {
      const pref = trimPrefix(path, layer.path);
      console.log(pref);
      routes = routes.concat(_findRoute(pref, layer.handle.stack));
      console.log(routes);
    } else {
      if (layer.name == "bound ") {
        routes.push({ route: layer || null, stack: stack });
      }
    }
  });
  return routes;
}

function trimPrefix(path, prefix) {
  return path.substr(prefix.length);
}

router.get("/restart", function(req, res) {
  const p = app._router.stack;
  const route = _findRoute("/domain/a", app._router.stack);
  console.log(route);
  try {
    ReApply();
    res.redirect("/");
  } catch (error) {
    res.render("index", { endpoints: null });
  }
});

router.get("/add", function(req, res) {
  res.render("add", { domain: DOMAIN });
});

router.get("/edit/:id", function(req, res) {
  const id = req.params.id;
  const data = db.getData(`/endpoints[${id}]`);

  const assignedData = Object.assign(data, {
    get: null,
    post: null,
    put: null,
    del: null,
    id: id
  });

  const selected = "selected";

  switch (data.method) {
    case "get":
      assignedData.get = selected;
      break;
    case "post":
      assignedData.post = selected;
      break;
    case "put":
      assignedData.put = selected;
      break;
    case "delete":
      assignedData.del = selected;
      break;
  }
  console.log(assignedData);
  res.render("edit", assignedData);
});

router.get("/delete/:id", async function(req, res) {
  const data = db.getData(`/endpoints[${req.params.id}]`);
  console.log(`Removing ${data.domain}${data.path}`);
  removeRoute(app, `/domain`);
  db.delete(`/endpoints[${req.params.id}]`);
  res.redirect("/");
});

router.post("/add", function(req, res) {
  let header;
  try {
    header = JSON.parse(req.body.header);
    const record = {
      domain: DOMAIN,
      path: req.body.path,
      method: req.body.method,
      header: header,
      body: req.body.body
    };
    db.push(`/endpoints[]`, record, true);
    res.redirect("/");
  } catch (error) {
    res.send(error);
  }
});

router.post("/edit/:id", function(req, res) {
  const id = req.params.id;
  let header;
  try {
    header = JSON.parse(req.body.header);
    const record = {
      domain: DOMAIN,
      path: req.body.path,
      method: req.body.method,
      header: header,
      body: req.body.body
    };
    db.push(`/endpoints[${id}]`, record, true);
    res.redirect("/");
  } catch (error) {
    res.send(error);
  }
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/", router);
app.use("/domain", domainRouter);
app.use("/domain/paths", pathRouter);
const port = process.argv[2]||3000
app.listen(port);

console.log(`Running at Port ${port}`);

function ReApply() {
  console.log("Reapplying...");

  try {
    const serverRouter = express.Router();

    const data = db.getData("/endpoints");
    data.forEach(function(endPoint) {
      const response = function(req, res) {
        res.set(endPoint.header);
        res.send(endPoint.body);
      };
      const path = endPoint.path;
      console.log(endPoint.method);
      switch (endPoint.method) {
        case "get": {
          console.log("get,", path);
          serverRouter.get(path, response);
          break;
        }
        case "post": {
          console.log("post,", path);
          serverRouter.post(path, response);
          break;
        }

        case "put": {
          console.log("put,", path);
          serverRouter.put(path, response);
          break;
        }

        case "delete": {
          console.log("delete,", path);
          serverRouter.delete(path, response);
          break;
        }
      }
    });
    app.use(`${DOMAIN}`, serverRouter);
    console.log(app.route.all);
  } catch (error) {
    console.log(error);
  }
  console.log(`Started`);
}
