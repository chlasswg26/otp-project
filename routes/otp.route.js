const express = require('express')
const Route = express.Router()
const { check } = require('express-validator')

const {
  verificationControllers, requestVerificationControllers, resentVerificationControllers,
} = require('../controllers/otp.controller')
const validate = require('../middlewares/validation')

Route.post(
  "/request",
  validate([
    check("code")
      .escape()
      .trim()
      .bail()
      .isString()
      .withMessage("Verification code must be string/random text"),
    check("type")
      .escape()
      .trim()
      .notEmpty()
      .withMessage("Verification Code can't be empty")
      .bail()
      .isIn(["email", "wa", "sms"])
      .withMessage("Invalid OTP verification type"),
  ]),
  requestVerificationControllers
)
  .post(
    "/resent",
    validate([
      check("session")
        .escape()
        .trim()
        .bail()
        .isString()
        .withMessage("OTP Session must be string"),
      check("code")
        .escape()
        .trim()
        .bail()
        .isString()
        .withMessage("Verification code must be string/random text"),
    ]),
    resentVerificationControllers
  )
  .post(
    "/verify",
    validate([
      check("code")
        .escape()
        .trim()
        .notEmpty()
        .withMessage("Verification Code can't be empty")
        .bail()
        .isString()
        .withMessage("Verification code must be string/random text"),
    ]),
    verificationControllers
  );

module.exports = Route
