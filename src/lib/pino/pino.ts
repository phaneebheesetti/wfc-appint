import pino from "pino"

import { env } from "@/env"

const isProduction = env.NODE_ENV === "production"

export const logger = pino({
  level: isProduction ? "info" : "debug",

  serializers: {
    req: pino.stdSerializers.req, // Standard HTTP request serializer
    res: pino.stdSerializers.res, // Standard HTTP response serializer
    err: pino.stdSerializers.err, // Standard error serializer
  },

  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }),
})
