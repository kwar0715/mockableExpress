const express = require("express");
const variableRoute = express.Router();
const _ = require("lodash");
const Database = require("../framework/db");
const Logger = require("../framework/logger");
const { ADMIN_PREFIX } = require("../config");

variableRoute.get("/", async function(req, res) {
    try {
        const variables = await Database.getAllVariables();
        res.render("variables/view", {
            variables
        });
    } catch (error) {
        Logger.error(`Variable View Error, error:${error}}`);
        res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
    }
});

variableRoute.post("/new", async function(req, res) {
    try {
        Logger.info(
            `Variables add New View ${JSON.stringify(req.body)}`
        );

        if(_.isEmpty(req.body.name) || _.isEmpty(req.body.value)){
            throw new Error(`No Valid Variable`)
        }
        const data={
            name:req.body.name,
            value:req.body.value
        }

        Database.addVariable(data);
    } catch (error) {
        Logger.error(
            `Variables add New View  { error:${error}}`
        );
    }

    res.redirect(`${ADMIN_PREFIX}/variables`);
});

variableRoute.get("/:name/delete", async function(req, res) {
    const name = req.params.name;

    try {
        await Database.removeVariable(name);

        Logger.info(`Variable Deleted {name : ${name}}`);
    } catch (error) {
        Logger.error(
            `Variable Deleted Error {name : ${name}}}`
        );
    }
    res.redirect(`${ADMIN_PREFIX}/variables`);
});

module.exports = variableRoute;