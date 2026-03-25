export const errorHandler = (err, req, res, next) => {
  // 1. Always log the critical details to the server terminal for the engineering team
  console.error("🚨 SERVER ERROR 🚨");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);

  // 2. Check the environment variables
  // If we haven't explicitly set it to 'production', assume we are in 'development'
  const environment = process.env.NODE_ENV || "development";

  // 3. Sanitize the output based on the environment
  const clientMessage =
    environment === "production"
      ? "Internal Server Error. The engineering team has been notified."
      : err.message;

  // 4. Send the response
  res.status(err.status || 500).json({
    success: false,
    message: clientMessage,
  });
};
