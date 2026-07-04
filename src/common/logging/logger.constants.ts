export const REDACTION_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.currentPassword',
  'req.body.newPassword',
];

export const REDACTION_CENSOR = '**redacted**';
