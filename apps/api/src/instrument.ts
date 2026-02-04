import * as Sentry from "@sentry/nestjs"

Sentry.init({
    dsn: "https://05275edf6d1d3e2ebe7a3923582c6bbe@o4510828558286848.ingest.us.sentry.io/4510828560580608",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
});
