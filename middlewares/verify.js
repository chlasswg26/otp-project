const jwt = require("jsonwebtoken");
const response = require("../helpers/response");
const createErrors = require("http-errors");
require("dotenv").config();
const { JWT_SECRET_KEY, JWT_ALGORITHM } = process.env;
const prisma = require("../config/prisma");

module.exports = {
  verifyToken: (req, res, next) => {
    try {
      const token = req.headers.authorization;

      if (typeof token !== "undefined") {
        const bearer = token.split(" ");
        const bearerToken = bearer[1];

        jwt.verify(
          bearerToken,
          JWT_SECRET_KEY,
          { algorithms: JWT_ALGORITHM },
          async (err, result) => {
            if (err) {
              if (err.message === 'jwt expired') {
                return response(res, err.status || 412, {
                  message: 'OTP token expired',
                })
              } else {
                return response(res, err.status || 412, {
                  message: err.message || err,
                });
              }
            } else {
              const pin = await prisma.pin.findFirst({
                where: {
                  session_id: result.session,
                },
                include: {
                  expiry_time: true,
                  template: true,
                },
              });

              if (!pin)
                throw new createErrors.NotAcceptable(
                  "Requested OTP was not found"
                );

              req.pin = pin;

              return next();
            }
          }
        );
      } else {
        throw new createErrors.PreconditionRequired(
          "Request token not found, please request OTP"
        );
      }
    } catch (error) {
      return response(res, error.status || 500, {
        message: error.message || error,
      });
    }
  },
};
