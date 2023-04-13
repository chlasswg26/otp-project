const express = require('express')
const Route = express.Router()

const otpRoutes = require('./otp.route')

Route
  .use('/otp', otpRoutes)

module.exports = Route
