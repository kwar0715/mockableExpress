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
  AUTHENTICATED:'authenticated'
}

const TABLES = {
  DOMAINS: 'domains',
  PATHS: 'paths',
  TEMP_DB:'tempDatabase'
}

const Database = function() {
  if (instance === null) {
    instance = this;
  }
  this.connection = mysql.createConnection({
    host     : MYSQL_HOST,
    user     : MYSQL_USERNAME,
    password : MYSQL_PASSWORD,
    database : MYSQL_DATABASE
  })
  return this;
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
    if (this.connection.state !== STATE.AUTHENTICATED) {
      await this.connect()
    }
    this.connection.query(query, function (error, results, fields) {
      if (error) {
        logger.error(`Mysql Query Error ${error}`);
        return reject(error);
      };
      return resolve(results);
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
        header TEXT NOT NULL,
        authentication BOOL,
        body LONGTEXT NULL
      )  ENGINE=INNODB;`

      await this.query(query);

      query = `CREATE TABLE IF NOT EXISTS tempDatabase (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(255) NOT NULL,
        body LONGTEXT NOT NULL
      )  ENGINE=INNODB;
      `
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
  return results;
}

Database.prototype.addDomain = async function(domainName) {
  if (!domainName) {
    logger.error(`Domain Name NotINNER Found`);
    return false;
  }
  const id = uuidv1();
  try {
    const exists = await this.rowExists(TABLES.DOMAINS, `domainName='${domainName}'`);
    if (exists.length <= 0) {
      await this.query(`INSERT INTO ${TABLES.DOMAINS}(domainId,domainName) VALUES ('${id}','${domainName}')`)
      return id;
    }
    return exists[0].domainId;
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

Database.prototype.getAllPaths = async function () {
  const results = await this.query(`SELECT domains.domainId,domains.domainName,paths.pathId,paths.pathName,paths.pathUrl,paths.pathMethod,paths.pathStatus,paths.pathDescription,paths.header,paths.authentication,paths.body FROM ${TABLES.DOMAINS} as domains INNER JOIN ${TABLES.PATHS} as paths ON domains.domainId=paths.domainId`);
  return results;
};

Database.prototype.getDomainFromId = async function (domainId) {
  const domain = await this.query(`SELECT domainId, domainName FROM ${TABLES.DOMAINS} WHERE domainId='${domainId}'`)
  if (domain.length > 0) {
    return domain[0];
  }
  return null;
};

Database.prototype.getPathNamesForDomain = async function (domainId) {
  const pathNames = [];
  const results = await this.query(`SELECT * FROM ${TABLES.PATHS} WHERE domainId = '${domainId}'`);
  results.forEach(result => pathNames.push(result));
  return pathNames;
};

Database.prototype.updateDomainName = async function(domainId, domainName) {
  await this.query(`UPDATE ${TABLES.DOMAINS} SET domainName ='${domainName}' WHERE domainId = '${domainId}'`);
};

Database.prototype.deleteDomain = async function(domainId) {
  await this.query(`DELETE FROM ${TABLES.DOMAINS} WHERE domainId = '${domainId}'`);
};

Database.prototype.getPathsFromDomainId = async function (domainId) {
  const results = await this.query(`SELECT domains.domainId,domains.domainName,paths.pathId,paths.pathName,paths.pathUrl,paths.pathMethod,paths.pathStatus,paths.pathDescription,paths.header,paths.authentication,paths.body FROM ${TABLES.DOMAINS} as domains INNER JOIN ${TABLES.PATHS} as paths ON domains.domainId=paths.domainId WHERE domains.domainId='${domainId}'`);
  if (results.length > 0) {
    return {
      domainName: results[0].domainName,
      paths:results
    }
  }
  const domain = await this.getDomainFromId(domainId);
  return {
    domainName: domain.domainName,
    paths:[]
  }
}

Database.prototype.addPath = async function (domainId, record) {
  const id = uuidv1();
  let query =`INSERT INTO ${TABLES.PATHS}(domainId,pathId,pathName,pathUrl,pathMethod,pathStatus,pathDescription,header,authentication,body) values('${domainId}','${id}','${record.pathName}','${record.pathUrl}','${record.pathMethod}','${record.pathStatus}','${record.pathDescription}','${JSON.stringify(record.header)}',${record.authentication},'${record.body}')`
  await this.query(query)
  return id;
};

Database.prototype.addQuery = async function (url, body) {
  let query = `INSERT INTO ${TABLES.TEMP_DB}(url,body) VALUES('${url}','${JSON.stringify(body)}')`;
  const result = await this.rowExists(TABLES.TEMP_DB, `url='${url}'`)
  if (result.length>0){
    query = `UPDATE ${TABLES.TEMP_DB} SET body='${JSON.stringify(body)}' WHERE url='${url}'`;
  }
  await this.query(query);
}

Database.prototype.getQuery = async function (queryUrl) {
  const query = `SELECT body FROM ${TABLES.TEMP_DB} WHERE '${queryUrl}' LIKE '%'||(SELECT domainName FROM ${TABLES.TEMP_DB} LIMIT 1)||'%'`;
  const result = await this.query(query)
  if (result.length === 0)
    return '';
  return result[0].body;
}

Database.prototype.getExistedPathId = async function ({ domainName, pathUrl, pathMethod, pathStatus }) {
  const results = await this.query(`SELECT domains.domainId,paths.pathId,paths.authentication 
  FROM ${TABLES.DOMAINS} as domains LEFT JOIN ${TABLES.PATHS} as paths 
  ON domains.domainId=paths.domainId 
  WHERE domains.domainName='${domainName}' AND paths.pathUrl = '${pathUrl}' AND paths.pathMethod = '${pathMethod}'`);
  if (results.length > 0) {
    return {
      domainId: results[0].domainId,
      pathId: results[0].pathId,
      authentication: results[0].authentication === 0 ? false :true
    }
  } else {
    return {}
  }
}

Database.prototype.getPath = async function (domainId, pathId) {
  const results = await this.query(`SELECT domains.domainId,domains.domainName,paths.pathId,paths.pathName,paths.pathUrl,paths.pathMethod,paths.pathStatus,paths.pathDescription,paths.header,paths.authentication,paths.body FROM ${TABLES.DOMAINS} as domains INNER JOIN ${TABLES.PATHS} as paths ON domains.domainId=paths.domainId WHERE domains.domainId='${domainId}' AND paths.pathId = '${pathId}'`);
  if (results.length > 0) {
    return {
      domainName: results[0].domainName,
      paths:results
    }
  }
  const domain = await this.getDomainFromId(domainId);
  if (domain === null) {
    return {
      domainName: null,
      paths:[]
    }
  }
  return {
    domainName: domain.domainName,
    paths:[]
  }
}

Database.prototype.updatePath = async function(domainId, pathId, record) {
  const query = `UPDATE ${TABLES.PATHS} SET 
  pathName='${record.pathName}',
  pathUrl='${record.pathUrl}',
  pathMethod='${record.pathMethod}',
  pathStatus='${record.pathStatus}',
  pathDescription='${record.pathDescription}',
  header='${JSON.stringify(record.header)}',
  authentication=${record.authentication},
  body='${record.body}' WHERE domainId='${domainId}' AND pathId='${pathId}'`
  await this.query(query);
};

Database.prototype.deletePath = async function(domainId, pathId) {
  await this.query(`DELETE FROM ${TABLES.PATHS} WHERE domainId = '${domainId}' AND pathId = '${pathId}'`);
};

Database.prototype.getPathsForDomain = function(domainId) {
  return db.getData(`/domains[${domainId}]`).paths;
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

Database.prototype.setEnableUpload = function (data) {
  db.push('/upload/',data,true)
}

Database.prototype.getEnableUpload = function (data) {
  return db.getData('/upload/')
}

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
