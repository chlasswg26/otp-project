const response = require("../helpers/response");
const createErrors = require("http-errors");
const jwt = require('jsonwebtoken')
require("dotenv").config();
const {
  NODE_ENV,
  SERVER_TIMEZONE,
  TIMEOUT_DURATION,
  JWT_SECRET_KEY,
  JWT_TOKEN_LIFE,
  JWT_ALGORITHM,
} = process.env;
const sendMail = require("../helpers/mailer");
const registrationEmailTemplate = require("../templates/registration.template");
const prisma = require("../config/prisma");
const moment = require("moment");
require("moment-timezone");
const { random } = require('../helpers/randomize')
const whatsapp = require('../config/whatsapp')

module.exports = {
  requestVerificationControllers: (req, res) => {
    const main = async () => {
      try {
        const data = req.body;
        let result = "";
        const expiryTime = moment
          .tz(SERVER_TIMEZONE)
          .utc()
          .add(data?.timeout ?? TIMEOUT_DURATION, data?.format ?? "minutes")
          .format("YYYY-MM-DDTHH:mm:ss[Z]");
        const zoneName = moment().locale(data?.locale || "en");
        const durationOfExpireTime = moment
          .duration(
            data?.timeout ?? TIMEOUT_DURATION,
            data?.format ?? "minutes"
          )
          .locale(zoneName)
          .humanize(false);
        let session_id;
        const generatedOTPCode = random();

        if (data?.template) {
          const template = await prisma.messageTemplate.findFirst({
            where: {
              message_code: data?.template,
            },
          });

          if (!template) data.template = false;
          else data.template = template;
        }

        result = await prisma.pin.create({
          data: !data?.template
            ? {
                code: generatedOTPCode,
                type: data.type,
                expiry_time: {
                  create: {
                    timeout_date: expiryTime,
                    timeout_count:
                      data?.timeout?.toString() ?? TIMEOUT_DURATION,
                    timeout_format: data?.format ?? "minutes",
                    locale: data?.locale || "en",
                  },
                },
              }
            : {
                code: generatedOTPCode,
                type: data.type,
                template: {
                  connect: {
                    id: data?.template?.id,
                  },
                },
                expiry_time: {
                  create: {
                    timeout_date: expiryTime,
                    timeout_count:
                      data?.timeout?.toString() ?? TIMEOUT_DURATION,
                    timeout_format: data?.format ?? "minutes",
                    locale: data?.locale || "en",
                  },
                },
              },
          include: {
            expiry_time: true,
            template: true,
          },
        });

        session_id = result.session_id

        if (!result)
          throw new createErrors.NotImplemented(
            "Request verification code failed"
          );

        switch (data.type) {
          case "email":
            await sendMail(
              data.email,
              "Verify your account",
              registrationEmailTemplate(generatedOTPCode, durationOfExpireTime)
            );
            break;
          case "wa":
            await whatsapp.sendMessage(
              data.phone.includes("@c.us") ? data.phone : `${data.phone}@c.us`,
              data?.template
                ? data?.template?.message
                    ?.replace("{$CODE}", `*${generatedOTPCode}*`)
                    ?.replace("{$TIMEOUT}", `*${durationOfExpireTime}*`)
                : `This is your verification code, do not give this code to other people except for the web.



Code: *${generatedOTPCode}*

Expire in *${durationOfExpireTime}*`
            );
            break;

          default:
            throw new createErrors.BadRequest("Verificaiton type invalid");
        }

        const sessionOTP = {
          session: session_id,
        };
        const token = jwt.sign(sessionOTP, JWT_SECRET_KEY, {
          algorithm: JWT_ALGORITHM,
          expiresIn: JWT_TOKEN_LIFE,
        });

        result = {
          token,
          type: result.type,
          template: result?.template?.message_code,
          detail: {
            date_of_expire: result.expiry_time.timeout_date,
            duration_of_expire: durationOfExpireTime
          },
        };

        return response(res, 200, "OTP Created", result);
      } catch (error) {
        return response(
          res,
          error.status || 500,
          error.message || "Server error"
        );
      }
    };

    main().finally(async () => {
      if (NODE_ENV === "development")
        console.log(
          "OTP Request Controllers: Ends the Query Engine child process and close all connections"
        );

      await prisma.$disconnect();
    });
  },
  resentVerificationControllers: (req, res) => {
    const main = async () => {
      try {
        const data = req.body;
        let result = "";
        const pin = req.pin
        const expiryTime = moment
          .tz(SERVER_TIMEZONE)
          .utc()
          .add(pin.expiry_time.timeout_count ?? TIMEOUT_DURATION, pin.expiry_time.timeout_format ?? "minutes")
          .format("YYYY-MM-DDTHH:mm:ss[Z]");
        const zoneName = moment().locale(pin.expiry_time.locale || "en");
        const durationOfExpireTime = moment
          .duration(pin.expiry_time.timeout_count ?? TIMEOUT_DURATION, pin.expiry_time.timeout_format ?? "minutes")
          .locale(zoneName)
          .humanize(false);
        const generatedOTPCode = random();

        result = await prisma.pin.update({
          where: {
            session_id: pin.session_id,
          },
          data: {
            code: generatedOTPCode,
            expiry_time: {
              update: {
                timeout_date: expiryTime,
              },
            },
          },
          include: {
            expiry_time: true,
            template: true,
          },
        });

        if (!result)
          throw new createErrors.NotImplemented(
            "Failed to update verification code"
          );

        switch (pin.type) {
          case "email":
            await sendMail(
              data.email,
              "Verify your account",
              registrationEmailTemplate(generatedOTPCode, durationOfExpireTime)
            );
            break;
          case "wa":
            await whatsapp.sendMessage(
              data.phone?.includes("@c.us") ? data.phone : `${data.phone}@c.us`,
              pin.template_id
                ? pin.template.message
                    ?.replace("{$CODE}", `*${generatedOTPCode}*`)
                    ?.replace("{$TIMEOUT}", `*${durationOfExpireTime}*`)
                : `This is your verification code, do not give this code to other people except for the web.



Code: *${generatedOTPCode}*

Expire in *${durationOfExpireTime}*`
            );
            break;

          default:
            throw new createErrors.BadRequest("Verification type invalid");
        }

        result = {
          type: result.type,
          template: result?.template?.message_code,
          detail: {
            date_of_expire: result.expiry_time.timeout_date,
            duration_of_expire: durationOfExpireTime,
          },
        };

        return response(res, 200, "OTP has been resent", result);
      } catch (error) {
        return response(
          res,
          error.status || 500,
          error.message || "Server error"
        );
      }
    };

    main().finally(async () => {
      if (NODE_ENV === "development")
        console.log(
          "OTP Resent Controllers: Ends the Query Engine child process and close all connections"
        );

      await prisma.$disconnect();
    });
  },
  verificationControllers: (req, res) => {
    const main = async () => {
      try {
        const data = req.body;
        const session = req.pin.session
        const pin = await prisma.pin.findFirst({
          where: {
            AND: [
              {
                code: {
                  equals: data.code,
                },
              },
              {
                session_id: {
                  equals: session,
                },
              },
            ],
          },
          include: {
            expiry_time: true,
            template: true,
          },
        });

        if (!pin)
          throw new createErrors.NotAcceptable(
            "Verification code is not valid"
          );

        const currentTime = moment()
          .tz(SERVER_TIMEZONE)
          .utc()
          .format("YYYY-MM-DDTHH:mm:ss[Z]");

        const expiryTime = pin.expiry_time.timeout_date.toISOString();
        const isCodeExpired = moment(currentTime).isBefore(expiryTime);

        if (pin.is_used)
          throw new createErrors.NotAcceptable(
            "Verification code has been used, please request new one"
          );

        if (!isCodeExpired)
          throw new createErrors.NotAcceptable(
            "Verification code expired, please resent OTP"
          );

        const id = pin.id;
        const result = await prisma.pin.update({
          where: {
            id,
          },
          data: {
            is_used: true,
          },
        });

        if (!result)
          throw new createErrors.NotImplemented("Verification failed");

        return response(res, 200, "OTP Verified", {
          message: "OTP Verification success",
        });
      } catch (error) {
        return response(
          res,
          error.status || 500,
          error.message || "Server error"
        );
      }
    };

    main().finally(async () => {
      if (NODE_ENV === "development")
        console.log(
          "Authentication Controllers: Ends the Query Engine child process and close all connections"
        );

      await prisma.$disconnect();
    });
  },
};
