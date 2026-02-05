import app from "./app";
import { initializeDatabases, closeDatabases } from "./config/database";
import { logger } from "./config/logger";

const PORT = process.env.PORT || 3000;

// Start server
async function startServer() {
  try {
    // Initialize databases
    await initializeDatabases();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await closeDatabases();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await closeDatabases();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

startServer();
