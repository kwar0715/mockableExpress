const express = require("express");
const bodyParser = require("body-parser");
const _ = require("underscore");
const cors = require('cors');
const expressMonitor = require('express-status-monitor');
const Database = require("./db");
const Logger = require("./logger");
const swaggerConfig = require('../resource/statConfig')

var instance = null;

const SAVE_COMMAND = /#save\(\"+\w+\"+,\"+\w+\"+\)#/;
const GET_COMMAND = /#get\(\"+\w+\"+\)#/;
const DEL_COMMAND = /#del\(\"+\w+\"+\)#/;
const IF_COMMAND = /#if\(\"\{*.+\}*\",[=<>!]+,\"\{*.+\}*\"\)([\n\s]*)\{(\w|\W(?!#if))+\}endif/
const FOR_COMMAND = /#for\(\"\d+\"\)([\n\s]*){((?!for)\w|\W)+}endfor/
const FOR_EACH_COMMAND = /#foreach\(\"+\[?[\w,]+\]?\"+,\"\w+\"\)([\n\s]*){((?!foreach)\w|\W)+}endforeach/
const VARIABLES =/!\w+=\w*!/

const COMMAND_CODE = {
  SAVE: "SAVE",
  GET: "GET",
  DELETE: "DELETE",
  IF: "IF",
  FOR: "FOR",
  FOREACH:"FOREACH",
  VARIABLE: "VARIABLE"
};

const Server = function() {
  this.app = express();
  this.app.set("view engine", "ejs");

  this.app.use(bodyParser.urlencoded({ extended: false }));
  this.app.use(bodyParser.json());
  this.app.use(cors());
  this.app.use(expressMonitor(swaggerConfig));
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

function removeComments(body) {
  return body.replace(/\/\*[\n\w+\s]*\*\//g, "");
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
    .replace('#save("', "")
    .replace('","', ",")
    .replace('")#', "")
    .split(",");
  return Database.saveCustomCommand(params[0], params[1]);
}

function execGetCommand(match) {
  const params = match[0].replace('#get("', "").replace('")#', "");
  return Database.getCustomCommand(params);
}

function execDelCommand(match) {
    const params = match[0].replace('#del("', "").replace('")#', "");
    return Database.delCustomCommand(params);
}

function execIfCommand(match, response) {
  //exatract parameters
  const params = match[0]
    .replace(`#if("`, "")
    .replace(`",`, ",")
    .replace(`,"`, ",")
    .replace(/\"\)([\n\s]*)\{(\w|\W(?!#if))+\}endif/, "").split(',');
  
  const isCompaired = compaire(params[0], params[1], params[2]);
  if (!isCompaired) {
    const y = response.replace(match[0], "");
    return y;
  }
  
  return match[0].replace(/#if\(\"\{*.+\}*\",[=<>!]+,\"\{*.+\}*\"\)([\n\s]*)\{/, "").replace(/\}endif/, "");
}

function execForCommand(match) {
  //exatract parameters
  const params = match[0]
  .replace('#for("', "")
    .replace(/\"\)([\n\s]*){((?!for)\w|\W)+}endfor/, "")
  const count = Number(params);
  
  const body = match[0].replace(/#for\(\"\d+\"\)([\n\s]*){/, "").replace(/}endfor/, "");

  let response = "";

  for (let i = 1; i <= count; i++){
    response = `${response}${body}`.replace(/(\r|\n)*/g, "");
  }
  return `${response}`;
}

function execForEachCommand(match) {
  //exatract parameters
  const params = match[0]
    .replace(/#foreach\(\"+/, '')
    .replace(/\"+,"/, '|')
    .replace(/\"\)([\n\s]*){((?!foreach)\w|\W)+}endforeach/, "").split('|')
  
  const arrayString = params[0];
  const elementString = params[1];
  let arr;
  try {
    arr = JSON.parse(arrayString.startsWith('[') && arrayString.endsWith(']') ? arrayString : `[${arrayString}]`);
  } catch (error) {
    return `Invalid Input Combination ${arrayString}`;
  }
  
  const body = match[0].replace(/#foreach\(\"+\[?[\w,]+\]?\"+,\"\w+\"\)([\n\s]*){/, "").replace(/}endforeach/, "");

  const returnArray = []

  arr.forEach(function (element) {
    let elementOut = body.replace(`{{${elementString}}}`, `${element}`).replace(/(\r|\n)*/g, "");
    try {
      elementOut = JSON.stringify(JSON.parse(elementOut));
    } catch (e) {
      
    }
    returnArray.push(elementOut);
  })
  return `[${returnArray}]`;
}

function execVariables(match, response) {
  
  const params = match[0].replace(/!/g, "").replace(/=/, ",").split(",");
  return response.replace(match[0],"").replace(new RegExp(`!${params[0]}`, 'g'),params[1])
}

function
  filterCommands(pattern, commandType, str) {
  try {
    const regExp = RegExp(pattern, "g");
    const modifiedStr = str;//.replace(/\s/g, "").replace(/#/g, '#\n').replace(/\/\//g, '\/\/\n');
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
        case COMMAND_CODE.FOR: {
          response = response.replace(match[0], execForCommand(match));
          break;
        }
        case COMMAND_CODE.FOREACH: {
          response = response.replace(match[0], execForEachCommand(match));
          break;
        }
        case COMMAND_CODE.VARIABLE: {
          response = execVariables(match,response)
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
    const response = function (req, res, next) {
      if (pathObject.authorization && (req.headers.authorization !== Database.getToken())) {
        res.status(401).send("Token missmatch; check your api token");
        return;
      }
      try {
        res.set(pathObject.header);

        let objectBody = pathObject.body;

        objectBody = removeComments(objectBody);
        objectBody = filterCommands(VARIABLES, COMMAND_CODE.VARIABLE, objectBody);
        objectBody = changeResponseBody(req.params, objectBody);
        objectBody = changeResponseBody(req.query, objectBody);
        objectBody = changeResponseBody(req.body, objectBody);
        objectBody = filterCommands(FOR_EACH_COMMAND, COMMAND_CODE.FOREACH, objectBody);
        

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
        
        objectBody = filterCommands(IF_COMMAND, COMMAND_CODE.IF, objectBody);
        objectBody = filterCommands(FOR_COMMAND, COMMAND_CODE.FOR, objectBody);
        Logger.info(`Reached ${path}`);
        const response = res.status(Number(pathObject.statusCode) || 200)
        const contentType = pathObject.header['Content-Type'];
        if (contentType.indexOf('application/json')) {
          response.json(objectBody);//.replace(/\s/g, ""))
          return;
        }
        response.send(objectBody)//.replace(/\s/g, ""));
      } catch (error) {
        Logger.info(`Reached Error {${path},error:${error}}`);
        next(error);

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
        let pathObject = null;
        try {
          pathObject = JSON.parse(path);
        } catch (error) {
          pathObject = path;
        }
        this.createEndpoint(domain.domain, pathObject);
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
