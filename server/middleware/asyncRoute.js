// Wrap async route handlers so a thrown error returns JSON instead of crashing the server.
export const asyncRoute = fn => (req, res, next) =>
  fn(req, res, next).catch(err => {
    if (!err.expose) console.error(err); // expected user errors aren't logged
    if (res.headersSent) return next(err);
    res.status(err.status && err.status < 600 ? err.status : 500).json({ error: err.expose ? err.message : "Something went wrong on the server. Try again." });
  });

// Create an error whose message is safe to show the user.
export const userError = (status, message) => Object.assign(new Error(message), { status, expose: true });
