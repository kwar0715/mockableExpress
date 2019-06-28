const JsonDB = require("node-json-db");
const bcrypt = require("bcrypt");
const uuidv1 = require("uuid/v1");
const { DB_PATH } = require('../config');
const { Config } = require("node-json-db/dist/lib/JsonDBConfig");

const db = new JsonDB(new Config(DB_PATH || "resource/database/jsonStore", true, false));
let instance = null;

const SALT_ROUNDS = 2;

const Database = function() {
    if (instance == null) {
        instance = this;
    }
    return instance;
};

Database.prototype.createTables = async function() {}

Database.prototype.getAllDomains = async function() {
    const domains = [];
    const domainPaths = await db.getData("/domains") || [];
    for (let i = 0; i < domainPaths.length; i++) {
        const domain = domainPaths[i];
        domains.push({
            domainId: domain.domainId,
            domainName: domain.domainName,
            pathCount: domain.paths.length
        })
    }
    return domains;
};

Database.prototype.domainExists = async function(domainName) {
    try {
        const domains = await db.getData(`/domains`) || [];
        return domains.filter(domain => domainName === domain.domainName)
    } catch (error) {
        await db.push(`/domains`, [], true);
        return [];
    }
}

Database.prototype.addDomain = async function(domainName) {

    if (!domainName) {
        return false;
    }
    const id = uuidv1();
    const record = {
        domainName: domainName,
        domainId: id,
        paths: []
    };
    try {
        const exists = await this.domainExists(domainName);
        if (exists.length <= 0) {
            await db.push(`/domains[]`, record, true);
            return id;
        }
        return exists[0].domainId;
    } catch (error) {
        return false;
    }

};

Database.prototype.getDomainFromId = async function(domainId) {
    const domains = db.getData(`/domains`) || [];
    const result = domains.filter(domain => domainId === domain.domainId);
    return result.length > 0 ? result[0] : null;
};

Database.prototype.updateDomainName = async function(domainId, domainName) {
    const domains = await db.getData("/domains") || []
    for (let i = 0; i < domains.length; i++) {
        if (domains[i].domainId === domainId) {
            const domain = {
                ...domains[i],
                domainName
            }
            db.push(`/domains[${i}]`, domain, true);
        }
    }
};

Database.prototype.deleteDomain = async function(domainId) {
    const domains = await db.getData(`/domains`) || [];
    for (let i = 0; i < domains.length; i++) {
        if (domains[i].domainId === domainId) {
            db.delete(`/domains[${i}]`);
        }
    }
};

Database.prototype.getPathNamesForDomain = async function(domainId) {
    const results = await this.getDomainFromId(domainId);
    return results.paths;
};

Database.prototype.getPathsFromDomainId = async function(domainId) {
    const domains = await db.getData("/domains") || []
    if (domains.length > 0) {
        for (let i = 0; i < domains.length; i++) {
            if (domains[i].domainId === domainId) {
                const { domainName, paths } = domains[i];
                return {
                    domainName,
                    paths
                }
            }
        }
    }
}

Database.prototype.getPathsForDomain = function(domainId) {
    const domains = this.getDomainFromId(domainId);
    return domains;
};

Database.prototype.addPath = async function(domainId, record) {
    const id = uuidv1();
    const domains = await db.getData("/domains") || []
    if (domains.length > 0) {
        for (let i = 0; i < domains.length; i++) {
            if (domains[i].domainId === domainId) {
                const path = {
                    pathId: id,
                    pathName: record.pathName,
                    pathUrl: record.pathUrl,
                    pathMethod: record.pathMethod,
                    pathStatus: record.pathStatus,
                    pathDescription: record.pathDescription,
                    header: JSON.stringify(record.header),
                    authentication: record.authentication,
                    body: record.body
                }
                await db.push(`/domains[${i}]/paths[]`, path, true);
            }
        }
    }
    return id;
};

Database.prototype.getPath = async function(domainId, pathId) {
    const domains = await db.getData("/domains") || []
    if (domains.length > 0) {
        for (let i = 0; i < domains.length; i++) {
            if (domains[i].domainId === domainId) {
                const paths = domains[i].paths;
                for (let j = 0; j < paths.length; j++) {
                    if (paths[j].pathId === pathId) {
                        return {
                            domainId,
                            domainName: domains[i].domainName,
                            paths: [{...domains[i].paths[j], domainId }]
                        }
                    }
                }
                return {
                    domainId,
                    domainName: domains[i].domainName,
                    paths: []
                }
            }
        }
    }
    return {
        domainName: null,
        paths: []
    }
};

Database.prototype.getExistedPathId = async function({ domainName, pathUrl, pathMethod, pathStatus }) {

    const domains = await db.getData("/domains") || []
    if (domains.length > 0) {
        for (let i = 0; i < domains.length; i++) {
            if (domains[i].domainName === domainName) {
                const paths = domains[i].paths;
                for (let j = 0; j < paths.length; j++) {
                    const path = paths[i];
                    if (path.pathUrl === pathUrl && path.pathMethod === pathMethod.toLowerCase() && path.pathStatus === pathStatus) {
                        return {
                            domainId: domains[i].domainId,
                            pathId: path.pathId,
                            authentication: path.authentication
                        }
                    }
                }
            }
        }
    }
    return {}
}

Database.prototype.updatePath = async function(domainId, pathId, record) {
    const domains = await db.getData("/domains") || []
    if (domains.length > 0) {
        for (let i = 0; i < domains.length; i++) {
            if (domains[i].domainId === domainId) {
                const paths = domains[i].paths;
                for (let j = 0; j < paths.length; j++) {
                    if (paths[j].pathId === pathId) {
                        const path = {
                            pathId: pathId,
                            pathName: record.pathName,
                            pathUrl: record.pathUrl,
                            pathMethod: record.pathMethod,
                            pathStatus: record.pathStatus,
                            pathDescription: record.pathDescription,
                            header: JSON.stringify(record.header),
                            authentication: record.authentication,
                            body: record.body
                        }
                        await db.push(`/domains[${i}]/paths[${j}]`, path, true);
                    }
                }
            }
        }
    }

};

Database.prototype.deletePath = async function(domainId, pathId, record) {
    const domains = await db.getData("/domains") || []
    if (domains.length > 0) {
        for (let i = 0; i < domains.length; i++) {
            if (domains[i].domainId === domainId) {
                const paths = domains[i].paths;
                for (let j = 0; j < paths.length; j++) {
                    if (paths[j].pathId === pathId) {
                        await db.delete(`/domains[${i}]/paths[${j}]`);
                    }
                }
            }
        }
    }
};

Database.prototype.deleteAllUsers = function(domainId, pathId, record) {
    db.delete(`/users`);
};

Database.prototype.deleteUsers = function(id) {

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
    let counter = 0;
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

Database.prototype.getToken = function(token) {
    return db.getData(`/authToken/`);
};

Database.prototype.saveApiUrl = function(url) {
    db.push(`/apiUrl/`, url, true);
};

Database.prototype.getApiUrl = function() {
    return db.getData(`/apiUrl/`);
};

Database.prototype.saveResetToken = function(token) {
    db.push(`/resetToken/`, token, true);
};

Database.prototype.getResetToken = function() {
    return db.getData(`/resetToken/`);
};
Database.prototype.deleteResetToken = function() {
    db.delete(`/resetToken/`);
};

module.exports = new Database();