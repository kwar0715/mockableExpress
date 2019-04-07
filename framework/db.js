const JsonDB = require("node-json-db");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig");

const db = new JsonDB(new Config("resource/database/jsonStore", true, false));
let instance = null;

const Database = function() {
  if (instance == null) {
    instance = this;
  }
  return instance;
};

Database.prototype.addDomain = function(domainName) {
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

Database.prototype.updatePath =function(domainId,pathId,record){
  db.push(`/domains[${domainId}]/paths[${pathId}]`, record, true);
}

Database.prototype.deletePath =function(domainId,pathId,record){
  db.delete(`/domains[${domainId}]/paths[${pathId}]`);
}

module.exports = new Database();
