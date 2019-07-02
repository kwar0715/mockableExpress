const express = require("express");
const domainRouter = express.Router();
const Database = require("../framework/db");
const Server = require("../framework/server");
const Logger = require("../framework/logger");
const { getPublicIP } = require("../framework/utils");
const { HOST, ADMIN_PREFIX } = require("../config");

// view domains
domainRouter.get("/", async function(req, res) {
    const IP = HOST ? HOST : await getPublicIP();
    let domains = null;
    try {
        domains = await Database.getAllDomains();
    } catch (error) {
        Logger.error(`Retrive Domain Data {Error: ${error}}`);
    }
    const status = Server().status;

    res.render("domain/viewDomain", {
        domains,
        status,
        ip: IP,
        port: Server().port
    });
});

domainRouter.post("/add", async function(req, res) {
    try {
        let name = req.body.domainName;
        name = name.startsWith("/") ? name : `/${name}`;
        await Database.addDomain(name);
    } catch (error) {
        Logger.error(`Domain Registration Error ${error}`);
    }
    res.redirect(`${ADMIN_PREFIX}/domain`);
});

domainRouter.get("/edit/:domainId", async function(req, res) {
    const IP = HOST ? HOST : await getPublicIP();
    try {
        const domainId = req.params.domainId;
        const domain = await Database.getDomainFromId(domainId);
        const domains = await Database.getAllDomains();
        const params = {
            domains,
            editable: domain,
            id: `${domainId}`,
            ip: IP,
            status: Server().status,
            port: Server().port
        };
        res.render("domain/viewDomain", params);
        Logger.info(`Domain Edit View Loaded {name: ${JSON.stringify(params)}}`);
    } catch (error) {
        Logger.error(`Domain Edit View Loaded Error ${error}`);
        res.redirect(`${ADMIN_PREFIX}/domain`);
    }
});

domainRouter.post("/edit/:domainId", async function(req, res) {
    const domainId = req.params.domainId;
    try {
        let newDomainName = req.body.domainName;
        newDomainName = newDomainName.startsWith("/") ? newDomainName : `/${name}`;
        const domain = await Database.getDomainFromId(domainId);
        const domainName = domain.domainName;
        const pathNames = await Database.getPathNamesForDomain(domainId);
        if (pathNames.length > 0) {
            pathNames.forEach(function(pathName) {
                Server().removeRoute(`${domainName}${pathName.pathUrl}`, pathName.pathMethod);
                Server().createEndpoint(name, pathName);
            });
        }
        await Database.updateDomainName(domainId, newDomainName);

        Logger.info(
            `Domain Edited {Id: ${domainId}, current name:${newDomainName} }`
        );
    } catch (error) {
        Logger.error(`Domain Edited Error {id : ${domainId}, error ${error}}`);
    }
    res.redirect(`${ADMIN_PREFIX}/domain`);
});

domainRouter.get("/delete/:domainId", async function(req, res) {
    const domainId = req.params.domainId;
    try {
        const domain = await Database.getDomainFromId(domainId);
        const domainName = domain.domainName;
        const pathNames = await Database.getPathNamesForDomain(domainId);
        if (pathNames.length > 0) {
            pathNames.forEach(function(pathName) {
                Server().removeRoute(`${domainName}${pathName.pathUrl}`, pathName.pathMethod);
            });
        }
        await Database.deleteDomain(domainId);
        Logger.info(`Domain Deleted {Id: ${domainId}}`);
    } catch (error) {
        Logger.error(`Domain Deleted Error {id : ${domainId}}, error:${error}`);
    }
    res.redirect(`${ADMIN_PREFIX}/domain`);
});

domainRouter.get("/restart", async function(req, res) {
    await Server().restart();
    res.redirect(`${ADMIN_PREFIX}/domain`);
});

domainRouter.get("/stop", async function(req, res) {
    await Server().stop();
    res.redirect(`${ADMIN_PREFIX}/domain`);
});

module.exports = domainRouter;