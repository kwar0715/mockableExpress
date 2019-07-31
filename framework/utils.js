const fetch = require('node-fetch');

module.exports.getPublicIP = async function () {
    try {
        const response = await fetch('https://api.ipify.org/?format=json');
        const result = await response.json();
        return result.ip;
    } catch (error) {
        return undefined;
    }
}

module.exports.secondsToHms=(time) =>{

    var h = Math.floor(time / 3600);
    var m = Math.floor(time % 3600 / 60);
    var s = Math.floor(time % 3600 % 60);

    return [h,m,s];
}

