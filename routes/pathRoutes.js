const express = require("express");
const pathRouter = express.Router();
const Database = require("../framework/db");
const Logger = require("../framework/logger");
const Server = require("../framework/server");

pathRouter.get("/:domainId", function(req, res) {
  const domainId = req.params.domainId;
  try {
    const domain = Database.getDomainFromId(req.params.domainId);

    const params = {
      domainName: domain.domain,
      domainId,
      endpoints: domain.paths
    };
    Logger.info(
      `Domain View {Id: ${domainId},domains:${JSON.stringify(params)}}`
    );
    res.render("paths/viewPaths", params);
  } catch (error) {
    Logger.error(`Domain Paths View Error {id : ${domainId}, error:${error}}`);
    res.redirect(`/domain/paths/${domainId}`);
  }
});

pathRouter.get("/:domainId/new", function(req, res) {
  const domainId = req.params.domainId;
  try {
    const domain = Database.getDomainFromId(req.params.domainId);
    const params = {
      domainName: domain.domain,
      domainId
    };
    Logger.info(
      `Domain New Path View {Id: ${domainId},domains:${JSON.stringify(params)}}`
    );
    res.render("paths/addPath", params);
  } catch (error) {
    Logger.error(
      `Domain New Path View Error {id : ${domainId}, error:${error}}`
    );
    res.redirect(`/domain/paths/${domainId}`);
  }
});

pathRouter.post("/:domainId/new", function(req, res) {
  const domainId = req.params.domainId;
  let header;
  try {
    const domainName = Database.getDomainFromId(domainId).domain;
    header = JSON.parse(req.body.header);
    let path = req.body.path;
    path = path.startsWith("/") ? path : `/${path}`;
    const record = {
      name: req.body.name,
      path: path,
      method: req.body.method,
      statusCode: req.body.statusCode,
      header: header,
      body: req.body.body
    };

    Database.addPath(domainId, record);
    Server().createEndpoint(domainName, record);
    Logger.info(
      `Domain New Path Added {Id: ${domainId},domains:${JSON.stringify(
        record
      )}}`
    );
  } catch (error) {
    Logger.error(
      `Domain New Path Added Error {id : ${domainId}, error:${error}}`
    );
  }
  res.redirect(`/domain/paths/${domainId}`);
});

pathRouter.get("/:domainId/:pathId/edit", function(req, res) {
  const domainId = req.params.domainId;
  const pathId = req.params.pathId;
  try {
    const domainName = Database.getDomainFromId(domainId).domain;
    const pathinfo = Database.getPath(domainId, pathId);
    const assignedData = Object.assign(pathinfo, {
      get: null,
      post: null,
      put: null,
      del: null,
      pathId,
      domainId,
      domainName
    });

    const selected = "selected";

    switch (pathinfo.method) {
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
    Logger.info(
      `Domain Edit Path {id : ${domainId}/${pathId},pathinfo:${JSON.stringify(
        assignedData
      )}}`
    );
    res.render(`paths/editPath`, assignedData);
  } catch (error) {
    Logger.error(
      `Domain Edit Path Error {id : ${domainId}/${pathId}, error:${error}}`
    );
    res.redirect(`/domain/paths/${domainId}`);
  }
});

pathRouter.post("/:domainId/:pathId/edit", function(req, res) {
  const domainId = req.params.domainId;
  const pathId = req.params.pathId;

  try {
    const domainName = Database.getDomainFromId(domainId).domain;
    const header = JSON.parse(req.body.header);
    let path = req.body.path;
    path = path.startsWith("/") ? path : `/${path}`;
    const record = {
      name: req.body.name,
      path: path,
      method: req.body.method,
      statusCode: req.body.statusCode,
      header: header,
      body: req.body.body
    };

    Server().removeRoute(`${domainName}${path}`, record.method);
    Server().createEndpoint(domainName, record);
    Database.updatePath(domainId, pathId, record);
    Logger.info(
      `Domain Path Edited {id : ${domainId}/${pathId},domains:${JSON.stringify(
        record
      )}}`
    );
  } catch (error) {
    Logger.error(
      `Domain Path Edited Error {id : ${domainId}/${pathId}, error:${error}}`
    );
  }
  res.redirect(`/domain/paths/${domainId}`);
});

pathRouter.get("/:domainId/:pathId/delete", function(req, res) {
  const domainId = req.params.domainId;
  const pathId = req.params.pathId;

  try {
    const domain = Database.getDomainFromId(domainId);
    const path = Database.getPath(domainId, pathId);

    Server().removeRoute(`${domain.domain}${path.path}`, path.method);
    Database.deletePath(domainId, pathId);

    Logger.info(`Domain Path Deleted {id : ${domain.domain}${path.path}}`);
  } catch (error) {
    Logger.error(
      `Domain Path Deleted Error {id : ${domainId}:${pathId}, error:${error}}`
    );
  }
  res.redirect(`/domain/paths/${domainId}`);
});

module.exports = pathRouter;
