const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const xss = require('xss-clean')
const favicon = require('serve-favicon')
const app = express()
const path = require('node:path')
require('dotenv').config()
const { NODE_ENV, PORT, COOKIE_SECRET_KEY, FRONTEND_URL } = process.env;
const cookieParser = require("cookie-parser");
const qrcode = require("qrcode-terminal");
const routesNavigator = require('./routes/all.route')
const whatsapp = require('./config/whatsapp')
const expressJSDocSwagger = require("express-jsdoc-swagger");
const swaggerJSON = require("./swagger.json");

expressJSDocSwagger(app)(
  {
    info: {
      version: "1.0.0",
      title: "OTP Project",
      license: {
        name: "MIT",
      },
    },
    baseDir: __dirname,
    swaggerUIPath: "/v1/api-docs",
    exposeSwaggerUI: true,
    exposeApiDocs: true,
    apiDocsPath: "/v1/api-spec.json",
    notRequiredAsNullable: true,
    swaggerUiOptions: {},
  },
  swaggerJSON
);

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])
app.use(helmet())
app.use(xss())
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use('/static', express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({
  extended: true
}))
app.use(express.json())
app.use(cookieParser(COOKIE_SECRET_KEY));
app.use(cors({
  origin: ['localhost', `http://localhost:${PORT}`, FRONTEND_URL],
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  credentials: true,
}))
app.use(morgan('dev'))

app.use('/api/v1', routesNavigator)
app.use('*', (req, res) => {
  res.status(404).json({
    method: req.method,
    message: 'cant find spesific endpoint, please make sure you read a documentation',
    status: false,
    code: 401
  })
})

whatsapp.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

whatsapp.on("message", (msg) => {
  if (msg.body) msg.reply("Harap tidak membalas/mengirim pesan pada kontak ini!");
});

whatsapp.initialize();

app.listen(PORT, () => {
  if (NODE_ENV === 'development') console.log(`Listen port at ${PORT}`)
})
