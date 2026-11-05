/**
 * 404 Not Found middleware for unmatched API endpoints
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
}
