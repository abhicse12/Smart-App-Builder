// Raw error messages can contain database, file-system or Docker
// details. Send them to the client only outside production; the full
// error is always logged on the server by the caller.
export const errorDetails = (error) =>
  process.env.NODE_ENV === "production"
    ? {}
    : { error: error?.message };
