const express = require("express");
const bodyParser = require("body-parser");
const _ = require("underscore");
const Database = require("./db");
const Logger = require("./logger");

var instance = null;

const SAVE_COMMAND = /#\nsave\(\"+\w+\"+,\"+\w+\"+\)#/;
const GET_COMMAND = /#\nget\(\"+\w+\"+\)#/;
const DEL_COMMAND = /#\ndel\(\"+\w+\"+\)#/;
const IF_COMMAND = /#\nif\(\"\w+\",.+,\"\w+\"\){.*}#/

const COMMAND_CODE = {
  SAVE: "S",
  GET: "G",
  DELETE: "D",
  IF:"IF"
};

const Server = function() {
  this.app = express();
  this.app.set("view engine", "ejs");

  this.app.use(bodyParser.urlencoded({ extended: false }));
  this.app.use(bodyParser.json());
  this.status = "Initialized";
  return this;
};

Server.prototype.init = function(port) {
  this.port = port;
  this.applyDomainList();
  this.listner = this.app.listen(this.port, function() {
    Logger.info(`Mockable Server : Start Listening at ${port}`);
  });
  this.status = "Started";
};

function changeResponseBody(params, body) {
  const values = Object.values(params);
  let objectBody = body;

  Object.keys(params).forEach(function(key, index) {
    const value = Number(values[index]) || `"${values[index]}"`;
    objectBody = objectBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return objectBody;
}

function compaire(value1, operator, value2) {
  switch (operator) {
    case '=': return value1 === value2;
    case '!=': return value1 !== value2;
    case '>': return Number(value1) > Number(value2);
    case '<': return Number(value1) < Number(value2);
    case '>=': return Number(value1) >= Number(value2);
    case '<=': return Number(value1) <= Number(value2);
    default: return false;
  }
}

function execSaveCommand(match) {
  const params = match[0]
    .replace('#\nsave("', "")
    .replace('","', ",")
    .replace('")#', "")
    .split(",");
  return Database.saveCustomCommand(params[0], params[1]);
}

function execGetCommand(match) {
  const params = match[0].replace('#\nget("', "").replace('")#', "");
  return Database.getCustomCommand(params);
}

function execDelCommand(match) {
    const params = match[0].replace('#\ndel("', "").replace('")#', "");
    return Database.delCustomCommand(params);
}

function execIfCommand(match,response) {
  
  //exatract parameters
  const params = match[0]
  .replace('#\nif("', "")
  .replace('",', ",")
  .replace(',"', ",")
  .replace(/\"\){.*}#/, "")
    .split(",");
  
  const isCompaired = compaire(params[0], params[1], params[2]);
  if (!isCompaired) {
    const y = response.replace(match[0], "");
    return y;
  }
  
  return match[0].replace(/#\nif\(\"\w+\",.+,\"\w+\"\){/, "").replace(/}#/, "");
}

function filterCommands(pattern, commandType, str) {
  try {
    const regExp = RegExp(pattern, "g");
    const modifiedStr = str.replace(/\s/g, "").replace(/#/g, '#\n');
    let response = modifiedStr;
    while ((match = regExp.exec(modifiedStr))) {
      if (match === null) break;

      Logger.info(`filterCommands: filtering {match: ${match[0]},${commandType}}`)
      switch (commandType) {
        case COMMAND_CODE.SAVE: {
          response = response.replace(match[0], execSaveCommand(match));
          break;
        }
        case COMMAND_CODE.GET: {
          response = response.replace(match[0], execGetCommand(match));
          break;
        }
        case COMMAND_CODE.DELETE: {
          response = response.replace(match[0], execDelCommand(match));
          break;
        }
        case COMMAND_CODE.IF: {
          response = execIfCommand(match,response);
          break;
        }
      }
    }
    return response;
  } catch (error) {
    Logger.error(`filterCommands: Regex filter error {commandType: ${commandType}, string: ${str},error: ${error}`);
  }
}

Server.prototype.createEndpoint = function(domainName, pathObject) {
  const path = `${domainName}${pathObject.path}`;
  try {
    const response = function(req, res) {
      try {
        res.set(pathObject.header);

        let objectBody = pathObject.body;

        objectBody = changeResponseBody(req.params, objectBody);
        objectBody = changeResponseBody(req.query, objectBody);
        objectBody = changeResponseBody(req.body, objectBody);

        objectBody = filterCommands(
          SAVE_COMMAND,
          COMMAND_CODE.SAVE,
          objectBody
        );

        objectBody = filterCommands(GET_COMMAND, COMMAND_CODE.GET, objectBody);
        objectBody = filterCommands(
          DEL_COMMAND,
          COMMAND_CODE.DELETE,
          objectBody
        );

        objectBody = filterCommands(IF_COMMAND, COMMAND_CODE.IF, objectBody,req);
        Logger.info(`Reached ${path}`);
        res.status(Number(pathObject.statusCode) || 200).send(objectBody.replace(/\s/g, ""));
      } catch (error) {
        Logger.info(`Reached Error {${path},error:${error}}`);
        res.send(`Response Body Error ${error}`);
      }
    };

    switch (pathObject.method) {
      case "get": {
        this.app.get(path, response);
        break;
      }
      case "post": {
        this.app.post(path, response);
        break;
      }
      case "put": {
        this.app.put(path, response);
        break;
      }
      case "delete": {
        this.app.delete(path, response);
        break;
      }
    }

    Logger.info(
      `Endpoint Created {Domain: ${domainName},Endpoint info: ${JSON.stringify(
        pathObject
      )}}`
    );
  } catch (error) {
    Logger.error(
      `Endpoint Created Error {Domain: ${domainName}${
        pathObject.path
      },error: ${error}}`
    );
  }
};

Server.prototype.applyDomainList = function() {
  try {
    const domains = Database.getAllDomains();
    domains.forEach(domain => {
      if (domain.paths.length === 0) return;
      domain.paths.forEach(path => {
        Logger.info(`Apply Endpoint : ${domain.domain}${path.path}`);
        this.createEndpoint(domain.domain, path);
      });
    });
  } catch (error) {
    Logger.error(`Domain List cannot Find ${error}`);
  }
};

const trimPrefix = function(path, prefix) {
  return prefix ? path.substr(prefix.length) : path;
};

const findRoute = function(stack, path) {
  let routes = [];
  stack.forEach(function(layer) {
    if (!layer) return;
    if (layer && !layer.match(path)) return;
    if (["query", "expressInit"].indexOf(layer.name) != -1) return;
    if (layer.name == "router") {
      routes = routes.concat(
        _findRoute(trimPrefix(path, layer.path), layer.handle.stack)
      );
    } else {
      if (layer.name == "bound dispatch") {
        routes.push({ route: layer || null, stack: stack });
      }
    }
  });
  return routes;
};

Server.prototype.removeRoute = function(path, method) {
  Logger.info(`Removing .... {path: ${path}, method: ${method}}`);
  const found = findRoute(this.app._router.stack, path);

  let route, stack;

  found.forEach(function(layer) {
    route = layer.route;
    stack = layer.stack;

    if (route) {
      if (method === undefined) {
        // if no method delete all resource with the given path
        idx = stack.indexOf(route);
        stack.splice(idx, 1);
      } else if (
        JSON.stringify(route.route.methods)
          .toUpperCase()
          .indexOf(method.toUpperCase()) >= 0
      ) {
        // if method defined delete only the resource with the given ath and method
        idx = stack.indexOf(route);
        stack.splice(idx, 1);
      }
    }
  });
  return true;
};

Server.prototype.stop = async function() {
  const port = this.port;
  try {
    await this.listner.close();
    Logger.info(`Closed Server at ${port}`);
    this.status = "Stopped";
  } catch (error) {
    Logger.error(`Cannot Close Server at ${this.port}, error : ${error}`);
  }
};

Server.prototype.restart = async function() {
  if (this.port === null) return;
  await this.stop();
  this.init(this.port);
};

module.exports = () => {
  if (!instance) {
    Logger.info("Instanced Server");
    instance = new Server();
  }
  return instance;
};
