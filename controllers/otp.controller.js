const response = require("../helpers/response");
const createErrors = require("http-errors");
require("dotenv").config();
const { NODE_ENV, SERVER_TIMEZONE } = process.env;
const sendMail = require("../helpers/mailer");
const registrationEmailTemplate = require("../templates/registration.template");
const prisma = require("../config/prisma");
const otpGenerator = require("otp-generator");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const moment = require("moment");
require("moment-timezone");

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "client-one",
  }),
});
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});
client.initialize();

module.exports = {
  requestVerificationControllers: (req, res) => {
    const main = async () => {
      try {
        const data = req.body;
        const bodyLength = Object.keys(data).length;
        let result = "";
        const expiryTime = moment
          .tz(SERVER_TIMEZONE)
          .utc()
          .add(data?.timeout ?? 5, data?.format ?? "minutes")
          .format("YYYY-MM-DDTHH:mm:ss[Z]");
        const zoneName = moment().locale(data?.locale || "en");
        const durationOfExpireTime = moment
          .duration(data?.timeout ?? 5, data?.format ?? "minutes")
          .locale(zoneName)
          .humanize(false);

        if (!bodyLength)
          throw new createErrors.BadRequest("Request body empty");

        if (!data?.code) {
          const randomCode = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: true,
            specialChars: false,
          });

          data.code = randomCode;
        }

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
                code: data.code,
                type: data?.type,
                expiry_time: {
                  create: {
                    timeout_date: expiryTime,
                    timeout_count: data?.timeout?.toString() ?? "5",
                    timeout_format: data?.format ?? "minutes",
                    locale: data?.locale || "en",
                  },
                },
              }
            : {
                code: data.code,
                type: data?.type,
                template: {
                  connect: {
                    id: data?.template?.id,
                  },
                },
                expiry_time: {
                  create: {
                    timeout_date: expiryTime,
                    timeout_count: data?.timeout?.toString() ?? "5",
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

        if (!result)
          throw new createErrors.NotImplemented(
            "Request verification code failed"
          );

        switch (data.type) {
          case "email":
            await sendMail(
              data.email,
              "Verify your account",
              registrationEmailTemplate(data.code, durationOfExpireTime)
            );
            break;
          case "wa":
            await client.sendMessage(
              data.phone.includes("@c.us") ? data.phone : `${data.phone}@c.us`,
              data?.template
                ? data?.template?.message
                    ?.replace("{$CODE}", `*${data.code}*`)
                    ?.replace("{$TIMEOUT}", `*${durationOfExpireTime}*`)
                : `This is your verification code, do not give this code to other people except for the web.



Code: *${data.code}*

Expire in *${durationOfExpireTime}*`
            );
            break;

          default:
            throw new createErrors.BadRequest("Verificaiton type invalid");
        }

        result = {
          message: `Verification code sent`,
          pin: {
            type: result.type,
            session: result.session_id,
            template: result?.template?.message_code,
            detail: {
              date_of_expire: result.expiry_time.timeout_date,
              duration_of_expire: durationOfExpireTime,
              is_used: result.is_used,
            },
          },
        };

        return response(res, 202, result);
      } catch (error) {
        return response(res, error.status || 500, {
          message: error.message || error,
        });
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
        const bodyLength = Object.keys(data).length;
        let result = "";

        if (!bodyLength)
          throw new createErrors.BadRequest("Request body empty");

        const pin = await prisma.pin.findFirst({
          where: {
            session_id: data?.session,
          },
          include: {
            expiry_time: true,
            template: true,
          },
        });

        if (!pin)
          throw new createErrors.NotAcceptable("OTP Session was not found");

        const expiryTime = moment
          .tz(SERVER_TIMEZONE)
          .utc()
          .add(pin.expiry_time.timeout_count ?? 5, pin.expiry_time.timeout_format ?? "minutes")
          .format("YYYY-MM-DDTHH:mm:ss[Z]");
        const zoneName = moment().locale(pin.expiry_time.locale || "en");
        const durationOfExpireTime = moment
          .duration(pin.expiry_time.timeout_count ?? 5, pin.expiry_time.timeout_format ?? "minutes")
          .locale(zoneName)
          .humanize(false);

        if (!data?.code) {
          const randomCode = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: true,
            specialChars: false,
          });

          data.code = randomCode;
        }

        result = await prisma.pin.update({
          where: {
            session_id: pin.session_id,
          },
          data: {
            code: data.code,
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
              registrationEmailTemplate(data.code, durationOfExpireTime)
            );
            break;
          case "wa":
            await client.sendMessage(
              data.phone?.includes("@c.us") ? data.phone : `${data.phone}@c.us`,
              pin.template_id
                ? pin.template.message
                    ?.replace("{$CODE}", `*${data.code}*`)
                    ?.replace("{$TIMEOUT}", `*${durationOfExpireTime}*`)
                : `This is your verification code, do not give this code to other people except for the web.



Code: *${data.code}*

Expire in *${durationOfExpireTime}*`
            );
            break;

          default:
            throw new createErrors.BadRequest("Verificaiton type invalid");
        }

        result = {
          message: `Verification code resent`,
          pin: {
            type: result.type,
            session: result.session_id,
            template: result?.template?.message_code,
            detail: {
              date_of_expire: result.expiry_time.timeout_date,
              duration_of_expire: durationOfExpireTime,
              is_used: result.is_used,
            },
          },
        };

        return response(res, 202, result);
      } catch (error) {
        return response(res, error.status || 500, {
          message: error.message || error,
        });
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
        const dataLength = Object.keys(data).length;

        if (!dataLength)
          throw new createErrors.BadRequest("Request parameters empty");

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
                  equals: data.session
                }
              }
            ],
          },
          include: {
            expiry_time: true,
            template: true
          }
        });
        const currentTime = moment()
          .tz(SERVER_TIMEZONE)
          .utc()
          .format("YYYY-MM-DDTHH:mm:ss[Z]");
        const expiryTime = pin.expiry_time.timeout_date.toISOString();
        const isCodeExpired = moment(currentTime).isBefore(expiryTime);

        if (!pin)
          throw new createErrors.NotAcceptable(
            "Verification code is not valid"
          );

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

        return response(res, 202, {
          message: "OTP Verification success",
        });
      } catch (error) {
        return response(res, error.status || 500, {
          message: error.message || error,
        });
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
