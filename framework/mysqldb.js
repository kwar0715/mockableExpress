const mysql = require('mysql');
const _ = require('lodash')
const Logger = require('./logger')
const Database = require("./db");

let connection;

const getConnectionString = async function(database){
    try {
        const config = await Database.getMysqlConfigs();
        return mysql.createConnection({
            host     : config.host,
            user     : config.username,
            password : config.password,
            database : database
        });
    } catch (error) {
        return null;
    }
}

const connect = async function(database){
    try {
        if(_.get(connection,'state','disconnected') === 'authenticated'){
            return;
        }
        connection = await getConnectionString(database);
        await connection.connect();
        connection.on('error', function(err) {
            Logger.error("[mysql error]",err);
        });
    } catch (error) {
        return error.message
    }
}

const disconnect = async function(){
    await connection.end();
}

const reconnect = async function(){
    await disconnect();
    await connect();
}

const query = async function(q){
    return new Promise((resolve,reject)=>{
        connection.query(q, function (error, results) {
            if (error) return reject(error);
            resolve(results);
        })
    })
};

module.exports = {
    connect,
    disconnect,
    reconnect,
    query
}