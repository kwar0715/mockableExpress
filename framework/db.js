const JsonDB = require("node-json-db");
const bcrypt = require("bcrypt");
const uuidv1 = require("uuid/v1");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig");

const db = new JsonDB(new Config("resource/database/jsonStore", true, false));
let instance = null;

const SALT_ROUNDS = 2;

const Database = function() {
  if (instance == null) {
    instance = this;
  }
  return instance;
};

Database.prototype.addDomain = function(domainName) {
  if (!domainName) {
    db.push(`/domains[]`, [], true);
  }
  const record = {
    domain: domainName,
    paths: []
  };
  db.push(`/domains[]`, record, true);
};

Database.prototype.getAllDomains = function() {
  return db.getData("/domains");
};

Database.prototype.getDomainFromId = function(domainId) {
  return db.getData(`/domains[${domainId}]`);
};

Database.prototype.updateDomaiName = function(domainId, domainName) {
  const domain = this.getDomainFromId(domainId);
  domain.domain = domainName;
  db.push(`/domains[${domainId}]`, domain, true);
};

Database.prototype.deleteDomain = function(domainId) {
  db.delete(`/domains[${domainId}]`);
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
    counter = counter + 1;
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
