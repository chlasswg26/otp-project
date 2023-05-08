const { Client, LocalAuth } = require("whatsapp-web.js");

const whatsapp = new Client({
  puppeteer: {
		args: ['--no-sandbox'],
	},
  authStrategy: new LocalAuth({ clientId: "client-otp" }),
});

module.exports = whatsapp;
