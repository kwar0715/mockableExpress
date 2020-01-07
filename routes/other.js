const express = require("express");
const fetch = require('node-fetch');
const Server = require('../framework/server');
const otherRouter = express.Router();
const Database = require("../framework/db");
const Logger = require("../framework/logger");
const {HOST} = require("../config");

// view domains
otherRouter.get("/nodeAdmin", async function(req, res) {
    const mysqlConfigs = await Database.getMysqlConfigs();

    if(!mysqlConfigs){
        return res.redirect('/nodeadmin')
    }

    const url = `http://${HOST}:${Server().getPort()}/nodeadmin/api/auth/login`
    const reload = `http://${HOST}:${Server().getPort()}/nodeadmin/#!/db`;
    const body = {
        mysqlUser: mysqlConfigs.username,
        mysqlPassword: mysqlConfigs.password,
        mysqlHost:mysqlConfigs.host
    }
    try {
        const response = await fetch(url,{method: "POST", body: JSON.stringify(body), headers: {
            'Content-Type': 'application/json'
        }});
        const data = await response.json();
        if(data.token){
            return res.json({
                reload,
                token: data.token
            });
        }
    } catch (error) {
        Logger.error(error);
    }
    return res.json({
        reload
    });
});


module.exports = otherRouter;