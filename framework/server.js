const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const expressWs = require('express-ws');
const expressMonitor = require('express-status-monitor');
const Database = require('./db');
const Logger = require('./logger');
const swaggerConfig = require('../resource/statConfig');

var instance = null;

const SAVE_COMMAND = /#save\(\"+\w+\"+,\"+\w+\"+\)#/;
const GET_COMMAND = /#get\(\"+([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}|\-*\w)+\"+\)#/;
const DEL_COMMAND = /#del\(\"+\w+\"+\)#/;
const IF_COMMAND = /#if\(\"+\{*.+\}*\"+,[=<>!*]+,\"\{*.+\}*\"\)([\n\s]*)\{(\w|\W(?!#if))+\}endif/;
const FOR_COMMAND = /#for\(\"+\d+\"+\)([\n\s]*){((?!for)\w|\W)+}endfor/;
const FOR_EACH_COMMAND = /#foreach\(\"+\[?[\w,]+\]?\"+,\"\w+\"\)([\n\s]*){((?!foreach)\w|\W)+}endforeach/;
const VARIABLES = /!\w+=\w*!/;
const QUERY = /#Query/;
const RANDOM = /#random\((\d+)\,(\d+)\,(\d+)\)#/;
const SET_STATUS = /#setStatus\((\d+)\)#/;
const PROG = /#prog([\n\s]*)\{(\w|\W(?!#))+\}([\n\s]*)endprog/;
const ENV_VARIABLE_COMMAND = /#env\(\"+\w+\"+\)#/;

const COMMAND_CODE = {
  SAVE: 'SAVE',
  GET: 'GET',
  DELETE: 'DELETE',
  IF: 'IF',
  FOR: 'FOR',
  FOREACH: 'FOREACH',
  VARIABLE: 'VARIABLE',
  QUERY: 'QUERY',
  RANDOM: 'RANDOM',
  QUERY_STATUS: 'QUERY_STATUS',
  GET_STATUS_CODE: 'GET_STATUS_CODE',
  PROG: 'PROG',
  ENV_VARIABLE: 'ENV_VARIABLE'
};

var socket =null;

const Server = function() {
  this.app = express();
  this.app.set('view engine', 'ejs');

  this.app.use(cors());
  this.app.use(expressMonitor(swaggerConfig));

  this.app.use(bodyParser.json({ limit: '50mb' }));
  this.app.use(
    bodyParser.urlencoded({
      limit: '50mb',
      extended: true,
      parameterLimit: 50000
    })
  );

  this.wsInstance = expressWs(this.app);
  this.status = 'Initialized';
  return this;
};

Server.prototype.init = async function(port) {
  this.port = port;
  await this.applyDomainList();
  this.app.ws('/', function(ws, req) {
    ws.on('message');
  });
  this.listner = this.app.listen(this.port, function() {
    Logger.info(`Mockable Server : Start Listening at ${port}`);
  });
  this.status = 'Started';
};

Server.prototype.sendData = function (data) {
  try {
    this.wsInstance.getWss().clients.forEach(function each(ws) {
      if (ws.isAlive === false) return ws.terminate();
      ws.send(data)
    });
  }catch (e) {}
}

function changeResponseBody(params, body) {
  const values = Object.values(params);
  let objectBody = body;
  Object.keys(params).forEach(function(key, index) {
    const value = Number(values[index]) || `"${values[index]}"`;
    try {
      objectBody = objectBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
    } catch (error) {}
  });

  return objectBody;
}

function removeComments(body) {
  return body.replace(/\/\*[\n\w+\s]*\*\//g, '');
}

function compaire(value1, operator, value2) {
  switch (operator) {
    case ',=,':
      return value1 === value2;
    case ',!=,':
      return value1 !== value2;
    case ',>,':
      return Number(value1) > Number(value2);
    case ',<,':
      return Number(value1) < Number(value2);
    case ',>=,':
      return Number(value1) >= Number(value2);
    case ',<=,':
      return Number(value1) <= Number(value2);
    case ',*<,':
      return String(value1).startsWith(String(value2));
    case ',*>,':
      return String(value1).endsWith(String(value2));
    default:
      return false;
  }
}

function execSaveCommand(match) {
  const params = match[0]
    .replace('#save("', '')
    .replace('","', ',')
    .replace('")#', '')
    .split(',');
  return Database.saveCustomCommand(params[0], params[1]);
}

function execGetCommand(match) {
  const params = match[0].replace('#get("', '').replace('")#', '');
  return Database.getCustomCommand(params);
}

function execRandCommand(match) {
  const params = match[0]
    .replace('#random(', '')
    .replace(')#', '')
    .split(',');
  return Number(
    Math.random() * (params[1] - params[0]) + params[0],
    params[2]
  ).toFixed(params[2]);
}

function execDelCommand(match) {
  const params = match[0].replace('#del("', '').replace('")#', '');
  return Database.delCustomCommand(params);
}

async function execEnvVariables(match) {
  const params = match[0].replace('#env("', '').replace('")#', '');
  return await Database.getVariable(params);
}

function execIfCommand(match, response) {
  // exatract parameters
  const params = match[0]
    .replace(/#if\(\"+/, '')
    .replace(/\"+,/, ',')
    .replace(/,\"/, ',')
    .replace(/\"\)([\n\s]*)\{(\w|\W(?!#if))+\}endif/, '')
    .split(/(\,=\,|\,!=\,|\,>\,|\,>=\,|\,<=\,|\,<\,|\,\*<\,|\,\*>\,)/);

  const isCompaired = compaire(params[0], params[1], params[2]);
  if (!isCompaired) {
    const y = response.replace(match[0], '');
    return y;
  }

  return match[0]
    .replace(/#if\(\"?\{*.+\}*\"?,[=<>!*]+,\"+\{*.+\}*\"\)([\n\s]*)\{/, '')
    .replace(/\}endif/, '');
}

async function execProgCommand(match, response) {
  // exatract parameters
  let params = match[0]
    .replace(/#prog([\n\s]*)\{/, '')
    .replace(/}([\n\s]*)endprog/, '');

  const returnResponse = response.replace(match[0], '');
  if (params.indexOf('require(') > 0) {
    return returnResponse.replace(
      /#prog_value#/g,
      'require is not a valid command here '
    );
  }

  params = `const lodash = require('lodash');
    const fetch = require('node-fetch');
    const moment = require('moment');
    const nodemailer = require('nodemailer');
    const path = require('path');
    const underscore = require('underscore');
    const faker = require('faker');
    const uuidv4 = require('uuid/v4');
    ${params}`;

  const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

  const value = await new AsyncFunction(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    params
  )(exports, require, module, __filename, __dirname);
  return returnResponse.replace(/#prog_value#/g, value);
}

function execForCommand(match) {
  // exatract parameters
  const params = match[0]
    .replace(/#for\(\"+/, '')
    .replace(/\"+\)([\n\s]*){((?!for)\w|\W)+}endfor/, '');
  const count = Number(params);

  const body = match[0]
    .replace(/#for\(\"+\d+\"+\)([\n\s]*){/, '')
    .replace(/}endfor/, '');

  let response = '';

  for (let i = 1; i <= count; i++) {
    response = `${response}${body}`.replace(/(\r|\n)*/g, '');
  }
  return `${response}`;
}

function execForEachCommand(match) {
  // exatract parameters
  const params = match[0]
    .replace(/#foreach\(\"+/, '')
    .replace(/\"+,"/, '|')
    .replace(/\"\)([\n\s]*){((?!foreach)\w|\W)+}endforeach/, '')
    .split('|');

  const arrayString = params[0];
  const elementString = params[1];
  let arr;
  try {
    arr = JSON.parse(
      arrayString.startsWith('[') && arrayString.endsWith(']')
        ? arrayString
        : `[${arrayString}]`
    );
  } catch (error) {
    return `Invalid Input Combination ${arrayString}`;
  }

  const body = match[0]
    .replace(/#foreach\(\"+\[?[\w,]+\]?\"+,\"\w+\"\)([\n\s]*){/, '')
    .replace(/}endforeach/, '');

  const returnArray = [];

  arr.forEach(function(element) {
    let elementOut = body
      .replace(`{{${elementString}}}`, `${element}`)
      .replace(/(\r|\n)*/g, '');
    try {
      elementOut = JSON.stringify(JSON.parse(elementOut));
    } catch (e) {}
    returnArray.push(elementOut);
  });
  return `[${returnArray}]`;
}

function execVariables(match, response) {
  const params = match[0]
    .replace(/!/g, '')
    .replace(/=/, ',')
    .split(',');
  return response
    .replace(match[0], '')
    .replace(new RegExp(`!${params[0]}`, 'g'), params[1]);
}

function getQuery(queryUrl) {
  return Database.getQuery(queryUrl);
}

function getStatusCode(match) {
  const params = match[0].replace('#setStatus(', '').replace(')#', '');
  return params !== undefined ? Number(params) : undefined;
}

function filterQueryStatus(response) {
  return response.replace(/#setStatus\((\d+)\)#/g, '');
}

async function filterCommands(pattern, commandType, str, url) {
  try {
    const regExp = RegExp(pattern, 'g');
    const modifiedStr = str; // .replace(/\s/g, "").replace(/#/g, '#\n').replace(/\/\//g, '\/\/\n');
    let response = modifiedStr;
    while ((match = regExp.exec(modifiedStr))) {
      if (match === null) break;
      switch (commandType) {
        case COMMAND_CODE.SAVE: {
          response = response.replace(match[0], execSaveCommand(match));
          break;
        }
        case COMMAND_CODE.GET: {
          response = response.replace(match[0], execGetCommand(match));
          break;
        }
        case COMMAND_CODE.RANDOM: {
          response = response.replace(match[0], execRandCommand(match));
          break;
        }
        case COMMAND_CODE.DELETE: {
          response = response.replace(match[0], execDelCommand(match));
          break;
        }
        case COMMAND_CODE.IF: {
          response = execIfCommand(match, response);
          break;
        }
        case COMMAND_CODE.PROG: {
          response = await execProgCommand(match, response);
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
          response = execVariables(match, response);
          break;
        }
        case COMMAND_CODE.ENV_VARIABLE: {
          response = response.replace(match[0], await execEnvVariables(match));
          break;
        }
        case COMMAND_CODE.QUERY: {
          const result = await getQuery(url);
          response = response.replace(match[0], result);
          break;
        }
        case COMMAND_CODE.GET_STATUS_CODE: {
          return getStatusCode(match);
        }
        case COMMAND_CODE.QUERY_STATUS: {
          response = filterQueryStatus(response);
          break;
        }
      }
    }
    if (commandType == COMMAND_CODE.GET_STATUS_CODE) {
      return undefined;
    }
    return response;
  } catch (error) {
    Logger.error(
      `filterCommands: Regex filter error {commandType: ${commandType}, string: ${str},error: ${error}`
    );
    return `${error}`;
  }
}

Server.prototype.createEndpoint = async function(domainName, active, pathObject) {

  if(!active){
    Logger.info(`Domain : ${domainName} Deactivated`);
  }

  const path = `${domainName}${pathObject.pathUrl}`;
  Logger.info(`Path : ${path}`);
  try {
    const response = async function(req, res, next) {
      if (
        pathObject.authentication === 1 &&
        req.headers.authorization !== Database.getToken()
      ) {
        res.status(401).send('Token miss match; check your api token');
        return;
      }
      try {
        res.set(pathObject.header);

        let objectBody = pathObject.body;

        Object.keys(req.query).forEach(key => {
          req.query[key] = req.query[key].replace(/\r?\n|\r/g, '');
        });

        objectBody = removeComments(objectBody);
        objectBody = await filterCommands(
          VARIABLES,
          COMMAND_CODE.VARIABLE,
          objectBody
        );
        objectBody = changeResponseBody(req.params, objectBody);
        objectBody = changeResponseBody(req.query, objectBody);
        objectBody = changeResponseBody(req.body, objectBody);
        objectBody = await filterCommands(
            ENV_VARIABLE_COMMAND,
            COMMAND_CODE.ENV_VARIABLE,
            objectBody
        );
        objectBody = await filterCommands(
          FOR_EACH_COMMAND,
          COMMAND_CODE.FOREACH,
          objectBody
        );

        objectBody = await filterCommands(
          SAVE_COMMAND,
          COMMAND_CODE.SAVE,
          objectBody
        );

        objectBody = await filterCommands(
          GET_COMMAND,
          COMMAND_CODE.GET,
          objectBody
        );
        objectBody = await filterCommands(
          DEL_COMMAND,
          COMMAND_CODE.DELETE,
          objectBody
        );

        objectBody = await filterCommands(
          IF_COMMAND,
          COMMAND_CODE.IF,
          objectBody
        );
        objectBody = await filterCommands(
          FOR_COMMAND,
          COMMAND_CODE.FOR,
          objectBody
        );
        objectBody = await filterCommands(
          QUERY,
          COMMAND_CODE.QUERY,
          objectBody,
          req.originalUrl
        );
        objectBody = await filterCommands(
          RANDOM,
          COMMAND_CODE.RANDOM,
          objectBody
        );
        const statusCode = await filterCommands(
          SET_STATUS,
          COMMAND_CODE.GET_STATUS_CODE,
          objectBody
        );
        objectBody = await filterCommands(
          SET_STATUS,
          COMMAND_CODE.QUERY_STATUS,
          objectBody
        );
        // Logger.info(`Reached ${path}`);
        objectBody = await filterCommands(PROG, COMMAND_CODE.PROG, objectBody);
        const response = res.status(
          statusCode || Number(pathObject.pathStatus) || 200
        );
        const contentType = pathObject.header['Content-Type'];
        if (contentType.indexOf('application/json') !== -1) {
          try {
            response.json(JSON.parse(objectBody)); // .replace(/\s/g, ""))
          } catch (error) {
            response.json(objectBody); // .replace(/\s/g, ""))
          }
          return;
        }
        if (contentType.indexOf('text/html') !== -1) {
          response.send(new Buffer(objectBody)); // .replace(/\s/g, ""))
          return;
        }
        return response.send(objectBody); // .replace(/\s/g, ""));
      } catch (error) {
        Logger.info(`Reached Error {${path},error:${error}}`);
        next(error);
      }
    };

    switch (pathObject.pathMethod) {
      case 'get': {
        this.app.get(path, response);
        break;
      }
      case 'post': {
        this.app.post(path, response);
        break;
      }
      case 'put': {
        this.app.put(path, response);
        break;
      }
      case 'delete': {
        this.app.delete(path, response);
        break;
      }
      case 'head': {
        this.app.head(path, response);
        break;
      }
    }

    Logger.info(`Endpoint Created {Domain: ${domainName}}`);
  } catch (error) {
    Logger.error(
      `Endpoint Created Error {Domain: ${domainName}${pathObject.path},error: ${error}}`
    );
  }
};

Server.prototype.applyDomainList = async function() {
  try {
    const results = await Database.getAllPaths();
    results.forEach(result => {
      this.createEndpoint(result.domainName, result.active, {
        ...result,
        header: JSON.parse(result.header)
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
    if (['query', 'expressInit'].indexOf(layer.name) != -1) return;
    if (layer.name == 'router') {
      routes = routes.concat(
        _findRoute(trimPrefix(path, layer.path), layer.handle.stack)
      );
    } else if (layer.name == 'bound dispatch') {
      routes.push({ route: layer || null, stack: stack });
    }
  });
  return routes;
};

Server.prototype.removeRoute = function(path, method) {
  Logger.info(`Removing .... {path: ${path}, method: ${method}}`);
  const found = findRoute(this.app._router.stack, path);

  let route;
  let stack;

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
    this.status = 'Stopped';
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
    Logger.info('Instanced Server');
    instance = new Server();
  }
  return instance;
};
