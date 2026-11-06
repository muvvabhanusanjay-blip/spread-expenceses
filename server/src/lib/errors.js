export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ error: first?.message || 'Invalid data.' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid identifier.' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'That item already exists.' });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('[error]', err);
  return res.status(500).json({ error: 'Something went wrong on our side.' });
}
