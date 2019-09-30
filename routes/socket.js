const express = require("express");
const socketRouter = express.Router();
const server = require('../framework/server');
const { HOST, API_PORT } = require("../config");

socketRouter.get("/", async function(req, res) {

    res.render("socket/trigger",{
        url: `ws://${HOST}:${API_PORT}`
    })
});

socketRouter.post("/send", async function(req, res) {
    server().sendData(req.body.value)
    res.end()
})

module.exports = socketRouter;