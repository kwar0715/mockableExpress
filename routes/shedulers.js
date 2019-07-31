const express = require("express");
const shedulerRoute = express.Router();
const _ = require("lodash");
const uuidv1 = require("uuid/v1");
const Database = require("../framework/db");
const Logger = require("../framework/logger");
const Scheduler = require("../framework/scheduler");
const { ADMIN_PREFIX } = require("../config");

shedulerRoute.get("/", async function(req, res) {
    try {
        const schedulers = await Database.getAllSchedulers();
        res.render("schedule/view", {
            schedulers
        });
    } catch (error) {
        Logger.error(`Scheduler View Error, error:${error}}`);
        res.redirect(`${ADMIN_PREFIX}/domain/paths/${domainId}`);
    }
});

shedulerRoute.get("/new", async function(req, res) {
    try {
        Logger.info(
            `Schduler New View `
        );
        res.render("schedule/add");
    } catch (error) {
        Logger.error(
            `Schduler New View  Error { error:${error}}`
        );
        res.redirect(`${ADMIN_PREFIX}/schedulers`);
    }
});

shedulerRoute.post("/new", async function(req, res) {
    try {
        Logger.info(
            `Schduler add New View ${JSON.stringify(req.body)}`
        );
        
        const data={
            id:uuidv1(),
            name:req.body.name,
            desc:req.body.desc,
            name:req.body.name,
            interval: req.body.interval,
            path:req.body.path,
            method:req.body.method,
            headers:req.body.header,
            body:req.body.body,
            status:'OFF'
        }
        
        Database.addScheduler(data);
    } catch (error) {
        Logger.error(
            `Schduler add New View  { error:${error}}`
        );
    }

    res.redirect(`${ADMIN_PREFIX}/schedulers`);
});

shedulerRoute.post("/changeStatus", async function(req, res) {
    try {
        Logger.info(
            `Changing Staus ${JSON.stringify(req.body)}`
        );
        
        const data={
            id:req.body.id,
            status:req.body.status
        }
        
        const job = Database.updateSchedulerStatus(data);

        if(data.status === 'RUN'){
            Scheduler().addSchedule(job)
        }else{
            Scheduler().removeScheduler(data.id);
        }
        
    } catch (error) {
        Logger.error(
            `Schduler add New View  { error:${error}}`
        );
    }

    res.redirect(`${ADMIN_PREFIX}/schedulers`);
});

shedulerRoute.get("/:id/delete", async function(req, res) {
    const id = req.params.id;

    try {
        await Database.removeScheduler(id);
        Scheduler().removeScheduler(id);

        Logger.info(`Scheduler Deleted {id : ${id}}`);
    } catch (error) {
        Logger.error(
            `Scheduler Deleted Error {id : ${id}}}`
        );
    }
    res.redirect(`${ADMIN_PREFIX}/schedulers`);
});


shedulerRoute.post("/delete", async function(req, res) {
    try {
        Logger.info(
            `Changing Staus ${JSON.stringify(req.body)}`
        );
        
        const data={
            id:req.body.id,
            status:req.body.status
        }
        
        const job = Database.updateSchedulerStatus(data);

        if(data.status === 'RUN'){
            Scheduler().addSchedule(job)
        }else{
            Scheduler().removeScheduler(data.id);
        }
        
    } catch (error) {
        Logger.error(
            `Schduler add New View  { error:${error}}`
        );
    }

    res.redirect(`${ADMIN_PREFIX}/schedulers`);
});

module.exports = shedulerRoute;