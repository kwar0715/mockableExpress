const express = require("express");
const bodyParser = require("body-parser");
const _= require('underscore');
const Database = require("./db");
const Logger = require("./logger");

var instance = null;

const Server = function () {
 
    this.app = express();
    this.app.set("view engine", "ejs");

    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    return this;
}

Server.prototype.createEndpoint= function(domainName, pathObject){
    const path = `${domainName}${pathObject.path}`;
    try {

        const response = function (req, res) {
            res.set(pathObject.header);
            res.send(pathObject.body);
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
        
        Logger.info(`Endpoint Created {Domain: ${domainName},Endpoint info: ${JSON.stringify(pathObject)}}`)
    }
    catch (error) {
        Logger.info(`Endpoint Created Error {Domain: ${domainName}${pathObject.path},error: ${error}}`)
    }
}

Server.prototype.applyDomainList = function () {
    const domains = Database.getAllDomains();
    domains.forEach(domain => {
        if (domain.paths.length === 0)
            return;
        domain.paths.forEach(path => {
            Logger.info(`Apply Endpoint : ${domain.domain}${path.path}`);
            this.createEndpoint(domain.domain,path);
        });
    });
}

const trimPrefix = function (path, prefix) {
    return prefix? path.substr(prefix.length): path;
}

const findRoute = function(stack,path) {
    let routes=[];
    stack.forEach(function(layer) {
        if (!layer) return;
        if (layer && !layer.match(path)) return;
        if (['query', 'expressInit'].indexOf(layer.name) != -1) return;
        if (layer.name == 'router') {
            routes=routes.concat(_findRoute(trimPrefix(path, layer.path),layer.handle.stack));
        } else {
            if (layer.name == 'bound dispatch') {
                routes.push({route: layer || null, stack: stack});
            }
        }
    });
    return routes;
}

Server.prototype.removeRoute = function (path, method) {
    Logger.info(`Removing .... {path: ${path}, method: ${method}}`)
    const found = findRoute(this.app._router.stack, path);

    let route, stack;
    
    found.forEach(function (layer) {
        route = layer.route;
        stack = layer.stack;

        if (route) {
            if(method === undefined){  // if no method delete all resource with the given path
                idx = stack.indexOf(route);
                stack.splice(idx, 1);
            }else if(JSON.stringify(route.route.methods).toUpperCase().indexOf(method.toUpperCase())>=0){  // if method defined delete only the resource with the given ath and method
                idx = stack.indexOf(route);
                stack.splice(idx, 1);
            }
        }
    });
    return true;
}

module.exports = () => {
    if (!instance) {
        Logger.info('Instanced Server')
        instance = new Server();
    }
    return instance;
};