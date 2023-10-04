import * as Sentry from "sentry-expo";

export function initSentry() {
  Sentry.init({
    dsn: "https://72e2fac8112331da13b9ad8337691293@o4505992838316032.ingest.sentry.io/4505992845328384",
    enableInExpoDevelopment: true,
    debug: process.env.NODE_ENV !== "production", // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  });
}
