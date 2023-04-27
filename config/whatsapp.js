const { Client, LocalAuth } = require("whatsapp-web.js");

const whatsapp = new Client({
  authStrategy: new LocalAuth({ clientId: "client-otp" }),
});

module.exports = whatsapp;
