const {DB_SELECT} = require('../config');

if(DB_SELECT === 'json'){
  return require('./jsondb');
}else{
  return require('./mysqldb')
}