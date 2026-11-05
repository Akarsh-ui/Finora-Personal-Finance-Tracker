/**
 * Centralized error handling middleware
 * Hides internal stack traces in production and returns clean JSON errors
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Server Error] ${err.message}`, isProduction ? '' : err.stack);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
