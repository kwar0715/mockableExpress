const fetch = require('node-fetch');

module.exports.getPublicIP = async function () {
    try {
        const response = await fetch('https://api.ipify.org/?format=json');
        const result = await response.json();
        return result.ip;
    } catch (error) {
        console.log(error);
        return undefined;
    }
}