const JsonDB = require("node-json-db");
const mysql = require('mysql');
const bcrypt = require("bcrypt");
const uuidv1 = require("uuid/v1");
const logger = require("../framework/logger");
const { DB_PATH, MYSQL_DATABASE,MYSQL_HOST,MYSQL_PASSWORD,MYSQL_USERNAME } = require('../config');
const { Config } = require("node-json-db/dist/lib/JsonDBConfig");

const db = new JsonDB(new Config(DB_PATH || "resource/database/jsonStore", true, false));
let instance = null;

const SALT_ROUNDS = 2;
const STATE = {
  DISCONNECTED:'disconnected'
}

const TABLES = {
  DOMAINS: 'domains',
  PATHS:'paths'
}

const Database = function() {
  if (instance == null) {
    instance = this;
  }
  this.connection = mysql.createConnection({
    host     : MYSQL_HOST,
    user     : MYSQL_USERNAME,
    password : MYSQL_PASSWORD,
    database : MYSQL_DATABASE
  })

  this.createTables().then(()=>instance).catch(()=> instance);
};

Database.prototype.connect = function () {
  const connection = this.connection;
  return new Promise(function(resolve, reject){
    connection.connect(function(err) {
      if (err) {
        logger.error(`Mysql Connection Error ${err}`);
        return reject(err);
      }
      logger.info(`Mysql Connected ${connection.threadId}`);
      return resolve(connection.threadId)
    });
  })
}

Database.prototype.disconnect = function () {
  const connection = this.connection;
  return new Promise(function(resolve, reject){
    connection.end(function(err) {
      if (err) {
        logger.error(`Mysql Disconnection Error ${err}`);
        return reject(err);
      }
      logger.info(`Mysql Disconnected ${connection.threadId}`);
      return resolve(connection.threadId)
    });
  })
}

Database.prototype.query = function (query) {
  logger.info(query)
  return new Promise(async (resolve, reject) => {
    if (this.connection.state === STATE.DISCONNECTED) {
      await this.connect()
    }
    this.connection.query(query, function (error, results, fields) {
      if (error) {
        logger.error(`Mysql Query Error ${error}`);
        return reject(error);
      };
      resolve(results);
    });
  })
  
}

Database.prototype.createTables = async function () {
  // domain table
  return new Promise(async (resolve, reject) => {
    try {
      let query = `CREATE TABLE IF NOT EXISTS domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        domainId VARCHAR(36) NOT NULL,
        domainName VARCHAR(255) NOT NULL
      )  ENGINE=INNODB;`;
    
      await this.query(query);
      
      query = `CREATE TABLE IF NOT EXISTS paths (
        id INT AUTO_INCREMENT PRIMARY KEY,
        domainId VARCHAR(36) NOT NULL,
        pathId VARCHAR(36) NOT NULL,
        pathName VARCHAR(255) NOT NULL,
        pathUrl VARCHAR(255) NOT NULL,
        pathMethod VARCHAR(255) NOT NULL,
        pathStatus VARCHAR(255) NOT NULL,
        pathDescription VARCHAR(255) NULL,
        header VARCHAR(255) NOT NULL,
        authentication BOOL,
        body VARCHAR(255) NULL
      )  ENGINE=INNODB;`

      await this.query(query);

      resolve(true);
    } catch (error) {
      logger.error(`Mysql Create tables Error ${err}`);
      reject(false)
    }
  })
}

Database.prototype.rowExists = async function (tablename, filter) {
  const results = await this.query(`SELECT * FROM ${tablename} WHERE ${filter}`);
  return results.length > 0;
}

Database.prototype.addDomain = async function(domainName) {
  if (!domainName) {
    logger.error(`Domain Name Not Found`);
    return false;
  }

  try {
    const exists = await this.rowExists(TABLES.DOMAINS, `domainName='${domainName}'`);
    if (!exists) {
      await this.query(`INSERT INTO ${TABLES.DOMAINS}(domainId,domainName) VALUES ('${uuidv1()}','${domainName}')`)
    }
  } catch (error) {
    logger.error(` ${error}`);
    return false;
  }
};

Database.prototype.getAllDomains = async function () {
  
  const domains = [];
  const domainPaths = await this.query(`SELECT domainId, domainName FROM ${TABLES.DOMAINS}`);
  for (let i = 0; i < domainPaths.length; i++){
    const domain = domainPaths[i];
    const pathsCount = await this.query(`SELECT COUNT(pathId) as pathCount FROM ${TABLES.PATHS} WHERE domainId='${domain.domainId}'`);
    domains.push({
      domainId: domain.domainId,
      domainName: domain.domainName,
      pathCount : pathsCount[0].pathCount
    })
  }  
  return domains;
};

Database.prototype.getDomainFromId = async function (domainId) {
  const domain = await this.query(`SELECT domainId, domainName FROM ${TABLES.DOMAINS} WHERE domainId='${domainId}'`)
  if (domain.length > 0) {
    return domain[0];
  }
  return null;
};

Database.prototype.getPathNamesForDomain = async function (domainId) {
  const domainNames = [];
  const paths = await this.query(`SELECT * FROM ${TABLES.PATHS} WHERE domainId = '${domainId}'`);
  paths.forEach(domainName => domainNames.push(domainName));
  return domainNames;
};

Database.prototype.updateDomainName = async function(domainId, domainName) {
  await this.query(`UPDATE ${TABLES.DOMAINS} SET domainName ='${domainName}' WHERE domainId = '${domainId}'`);
};

Database.prototype.deleteDomain = async function(domainId) {
  await this.query(`DELETE FROM ${TABLES.DOMAINS} WHERE domainId = '${domainId}'`);
};

Database.prototype.getPathsForDomain = function(domainId) {
  return db.getData(`/domains[${domainId}]`).paths;
};

Database.prototype.addPath = function(domainId, record) {
  db.push(`/domains[${domainId}]/paths[]`, record, true);
};

Database.prototype.getPath = function(domainId, pathId) {
  return db.getData(`/domains[${domainId}]/paths[${pathId}]`);
};

Database.prototype.updatePath = function(domainId, pathId, record) {
  db.push(`/domains[${domainId}]/paths[${pathId}]`, record, true);
};

Database.prototype.deletePath = function(domainId, pathId, record) {
  db.delete(`/domains[${domainId}]/paths[${pathId}]`);
};

Database.prototype.deleteAllUsers = function(domainId, pathId, record) {
  db.delete(`/users`);
};

Database.prototype.deleteUsers = function (id) {
  
  db.delete(`/users[${id}]`);
};

Database.prototype.setUser = function(username, password, userEmail, id) {
  bcrypt.hash(password, SALT_ROUNDS, function(err, hash) {
    if (err) {
      throw new Error(err);
    }
    const user = {
      id: id || uuidv1(),
      username,
      userEmail,
      password: hash
    };
    db.push(`/users[]`, user, true);
  });
};

Database.prototype.getAllUsers = function() {
  return db.getData("/users");
};

const checkValidity = async function(username, password, user) {
  return bcrypt
    .compare(password, user.password)
    .then(function(res) {
      if (res) {
        if (user.username === username) {
          return {
            username,
            action: true
          };
        }
        return {
          username,
          action: false
        };
      }
    })
    .catch(function(error) {
      throw new Error(error);
    });
};

Database.prototype.getUser = async function(username, password) {
  const users = db.getData(`/users`);

  let userFound = false;
  let userId = null;
  let  counter= 0;
  for (user of users) {
    counter = counter + 1;
    try {
      const userinfo = await checkValidity(username, password, user);
      if (!userinfo.action) {
        continue;
      }
      userFound = true;
      userId = user.id;
      break;
    } catch (error) {
      continue;
    }
  }
  if (userFound) {
    return {
      userId,
      username,
      counter,
      action: true
    };
  }
  return {
    userId,
    username,
    counter,
    action: false
  };
};

Database.prototype.getUserFromUsername = async function(username) {
  const users = db.getData(`/users`);
  let counter = 0;
  for (user of users) {
    if (user.username === username) {
      return {
        ...user,
        counter
      }
    }
    counter = counter + 1;
  }
  return null;
};

Database.prototype.saveCustomCommand = function(key, value) {
  db.push(`/userCommands/${key}/`, value, true);
  return "";
};

Database.prototype.getCustomCommand = function(key, value) {
  return db.getData(`/userCommands/${key}/`);
};

Database.prototype.delCustomCommand = function(key, value) {
  db.delete(`/userCommands/${key}/`);
  return "";
};

Database.prototype.saveToken = function(token) {
  db.push(`/authToken/`, token, true);
};

Database.prototype.getToken = function (token) {
  return db.getData(`/authToken/`);
};

Database.prototype.saveApiUrl = function(url) {
  db.push(`/apiUrl/`, url, true);
};

Database.prototype.getApiUrl = function () {
  return db.getData(`/apiUrl/`);
};

Database.prototype.saveResetToken = function(token) {
  db.push(`/resetToken/`, token, true);
};

Database.prototype.getResetToken = function () {
  return db.getData(`/resetToken/`);
};
Database.prototype.deleteResetToken = function() {
  db.delete(`/resetToken/`);
};

module.exports = new Database();
