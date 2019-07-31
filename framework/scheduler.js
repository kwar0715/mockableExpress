
const schedule = require('node-schedule');
const _ = require('lodash');
const fetch = require('node-fetch');
const Logger = require("./logger");
const {secondsToHms} = require('./utils');

var instance = null;

const schdulers = [];

const Scheduler = function () {
   
    return this;
};

Scheduler.prototype.addSchedule = (entryJob) => {

    const {
        id,
        path,
        interval,
        headers,
        method,
        body
    } = entryJob;

    if (_.isEmpty(id) ||
        _.isEmpty(path) ||
        _.isEmpty(interval) ||
        _.isEmpty(headers) ||
        _.isEmpty(method) ) {
        Logger.error(`Invalid params missing : ${JSON.stringify(entryJob)}`)
        return;
    }

    const timeStr = secondsToHms(Number(interval));
    const timePattern = `*${timeStr[2]===0? '' : `/${timeStr[2]}`} *${timeStr[1]===0? '' : `/${timeStr[1]}`} *${timeStr[0]===0? '' : `/${timeStr[0]}`} * * *`;
    Logger.info(`Starts ${timePattern}`)
    const job = schedule.scheduleJob(timePattern, async () => {
        try {
            await fetch(path, {
                method,
                body: method.toLowerCase()==='get'? null : body,
                headers:JSON.parse(headers)
            })
            Logger.info(path)
        } catch (error) {
            Logger.error(error)
        }
    });

    schdulers.push({
        id,
        job
    })

    Logger.info(`Scheduler is Added ${id}`)
}

Scheduler.prototype.removeScheduler = (id) => {
    try {
        const job = _.filter(schdulers,data=>data.id===id);
        if(!_.isEmpty(job)){
            job[0].job.cancel();
            _.remove(schdulers,data=>data.id===id)
            Logger.info('Scheduler is Stopped')
        }
    } catch (error) {
        Logger.error(`Remove Scheduler Error ${error}`)
    }
}


module.exports = () => {
    if (!instance) {
        Logger.info("Instanced Scheduler");
        instance = new Scheduler();
    }
    return instance;
};