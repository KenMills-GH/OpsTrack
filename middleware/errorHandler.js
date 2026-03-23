// middleware/errorHandler.js

export const errorHandler = (err, req, res, next) => {
  // Log the raw error to your terminal so you can still debug it
  console.error("🔥 [ERROR]:", err.message);

  // Send the standardized 500 response to the client
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message, // Optional: Sends the actual error text back for easier testing
  });
};
