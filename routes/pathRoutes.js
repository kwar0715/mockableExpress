const express = require("express");
const pathRouter = express.Router();
const _ = require("lodash");
const uuidv1 = require("uuid/v1");
const Database = require("../framework/db");
const Logger = require("../framework/logger");
const Server = require("../framework/server");
const { ADMIN_PREFIX } = require("../config");

pathRouter.get("/:domainId", async function(req, res) {
    const domainId = req.params.domainId;
    try {
        const domain = await Database.getPathsFromDomainId(req.params.domainId);
        const apiUrl = Database.getApiUrl();
        const params = {
            domainName: domain.domainName,
            domainId,
            apiUrl,
            endpoints: domain.paths
        };
        Logger.info(
            `Domain View {Id: ${domainId},domains:${JSON.stringify(params)}}`
        );
        res.render("paths/viewPaths", params);
    } catch (error) {
        Logger.error(`Domain Paths View Error {id : ${domainId}, error:${error}}`);
        res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
    }
});

pathRouter.get("/:domainId/new", async function(req, res) {

    const domainId = req.params.domainId;
    try {
        const domain = await Database.getDomainFromId(domainId);
        const params = {
            domainName: domain.domainName,
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
        res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
    }
});

pathRouter.post("/:domainId/new", async function(req, res) {
    const domainId = req.params.domainId;
    const domain = await Database.getDomainFromId(domainId);
    try {
        const header = JSON.parse(req.body.header);
        let path = req.body.path;
        path = path.startsWith("/") ? path : `/${path}`;
        const pathId = uuidv1();

        const existedApi = _.filter(domain.paths, p =>
            p.pathUrl === path && p.pathMethod === req.body.method
        )

        if (!_.isEmpty(existedApi)) {
            path += `/${pathId}`
            req.body.desc += `\n(Trying to copy ${path}, Please Use Edit)`
        }

        const record = {
            pathName: req.body.name,
            pathUrl: path,
            pathDescription: req.body.desc,
            pathMethod: req.body.method,
            pathStatus: req.body.statusCode,
            header: header,
            authentication: req.body.authentication ? true : false,
            body: req.body.body
        };

        await Database.addPath(domainId, record, pathId);
        Server().createEndpoint(domain.domainName, record);
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
    res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
});

pathRouter.get("/:domainId/:pathId/edit", async function(req, res) {
    const domainId = req.params.domainId;
    const pathId = req.params.pathId;
    try {
        const pathInfo = await Database.getPath(domainId, pathId);
        const assignedData = Object.assign(pathInfo.paths[0], {
            get: null,
            post: null,
            put: null,
            del: null,
            header: JSON.parse(pathInfo.paths[0].header),
            domainName: pathInfo.domainName
        });

        const selected = "selected";
        switch (pathInfo.paths[0].pathMethod) {
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
            `Domain Edit Path {id : ${domainId}/${pathId}, pathInfo:${JSON.stringify(
                assignedData
            )}}`
        );
        res.render(`paths/editPath`, assignedData);
    } catch (error) {
        Logger.error(
            `Domain Edit Path Error {id : ${domainId}/${pathId}, error:${error}}`
        );
        res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
    }
});

pathRouter.post("/:domainId/:pathId/edit", async function(req, res) {

    const domainId = req.params.domainId;
    const pathId = req.params.pathId;
    const pathResult = await Database.getPath(domainId, pathId);
    const previousDomainName = pathResult.domainName;
    const previousPathUrl = pathResult.paths[0].pathUrl;
    const previousPathMethod = pathResult.paths[0].pathMethod;
    let path = req.body.path;
    path = path.startsWith("/") ? path : `/${path}`;

    const existedPath = await Database.getExistedPathId({
        domainName: previousDomainName,
        pathUrl: previousPathUrl,
        pathMethod: previousPathMethod
    });
    if (_.isEmpty(existedPath)) {
        Logger.info(
            `Domain New Path can not be Edited {Id: ${domainId},pathId${pathId}}`
        );
        return res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
    }
    try {

        const record = {
            pathName: req.body.name,
            pathUrl: path,
            pathDescription: req.body.desc,
            pathMethod: req.body.method,
            pathStatus: req.body.statusCode,
            header: JSON.parse(req.body.header),
            authentication: req.body.authentication ? true : false,
            body: req.body.body
        };

        Server().removeRoute(`${previousDomainName}${previousPathUrl}`, previousPathMethod);
        Server().createEndpoint(previousDomainName, record);
        await Database.updatePath(domainId, pathId, record);

        Logger.info(
            `Domain New Path Edited {Id: ${domainId},domains:${JSON.stringify(
                record
            )}}`
        );
    } catch (error) {
        Logger.error(
            `Domain New Path Edited Error {id : ${domainId}, error:${error}}`
        );
    }
    res.redirect(`/admin/domain/paths/${domainId}`);
});

pathRouter.get("/:domainId/:pathId/delete", async function(req, res) {
    const domainId = req.params.domainId;
    const pathId = req.params.pathId;

    try {
        const pathResult = await Database.getPath(domainId, pathId);

        Server().removeRoute(`${pathResult.domainName}${pathResult.paths[0].pathUrl}`, pathResult.paths[0].pathMethod);
        await Database.deletePath(domainId, pathId);

        Logger.info(`Domain Path Deleted {id : ${domain.domain}${pathResult.paths[0].pathUrl}}`);
    } catch (error) {
        Logger.error(
            `Domain Path Deleted Error {id : ${domainId}:${pathId}, error:${error}}`
        );
    }
    res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
});

module.exports = pathRouter;