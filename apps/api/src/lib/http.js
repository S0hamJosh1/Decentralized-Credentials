export function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function asyncHandler(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

export function sendError(response, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const message = status >= 500 ? "Internal server error." : error?.message || "Request failed.";
  response.status(status).json({ error: message });
}
