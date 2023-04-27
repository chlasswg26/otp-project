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
    check("type")
      .escape()
      .trim()
      .notEmpty()
      .withMessage("Verification type can't be empty")
      .bail()
      .isIn(["email", "wa", "sms"])
      .withMessage("Invalid OTP verification type"),
    check("phone")
      .optional({
        nullable: true,
        checkFalsy: true,
      })
      .escape()
      .trim()
      .notEmpty()
      .withMessage("Phone number can't be empty")
      .bail()
      .isMobilePhone("any")
      .withMessage("Please enter a valid mobile phone number"),
    check("email")
      .optional({
        nullable: true,
        checkFalsy: true,
      })
      .escape()
      .trim()
      .notEmpty()
      .withMessage("Email address can't be empty")
      .bail()
      .isEmail()
      .withMessage("E-mail bad format"),
  ]),
  requestVerificationControllers
)
  .post(
    "/resent",
    validate([
      check("phone")
        .optional({
          nullable: true,
          checkFalsy: true,
        })
        .escape()
        .trim()
        .notEmpty()
        .withMessage("Phone number can't be empty")
        .bail()
        .isMobilePhone("any")
        .withMessage("Please enter a valid mobile phone number"),
      check("email")
        .optional({
          nullable: true,
          checkFalsy: true,
        })
        .escape()
        .trim()
        .notEmpty()
        .withMessage("Email address can't be empty")
        .bail()
        .isEmail()
        .withMessage("E-mail bad format"),
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
        .withMessage("Verification code can't be empty"),
    ]),
    verificationControllers
  );

module.exports = Route
