const mysql = require('mysql');
const Database = require("./db");

let connection;

const getConnectionString = function(database){
    const config = Database.getMysqlConfigs();
    return mysql.createConnection({
        host     : config.host,
        user     : config.username,
        password : config.password,
        database : database
      });
}

const connect = function(){
    return 'X';
    connection = getConnectionString();
    connection.connect();
}

const disconnect = function(){
    connection.end();
}

const reconnect = function(){
    disconnect();
    connect();
}

//const query = connection.query;

module.exports = {
    connect,
    disconnect,
    reconnect
}