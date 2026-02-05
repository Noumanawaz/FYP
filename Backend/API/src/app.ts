import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { existsSync } from "fs";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { logger } from "./config/logger";

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const isDevelopment = process.env.NODE_ENV !== "production";
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In development, allow all localhost origins (any port)
    if (isDevelopment && origin && origin.startsWith("http://localhost:")) {
      return callback(null, true);
    }

    // Use configured origins
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || [];
    if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
      // If no origins configured or wildcard, allow all in dev
      return callback(null, isDevelopment);
    }

    // Check if origin is in allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isDevelopment ? "1000" : "100")), // 1000 for dev, 100 for prod
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks and swagger docs
    return req.path === "/api/health" || req.path.startsWith("/api-docs");
  },
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Swagger configuration
const PORT = process.env.PORT || 3000;

// 1. Definition for swagger-jsdoc
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Restaurant RAG API",
      version: "1.0.0",
      description: "API documentation for Restaurant RAG system",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/app.ts"], // files containing annotations
};

// 2. Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions) as any;

try {
  // 3. Try to load static swagger.yaml from src/swagger directory
  // Use path.resolve to ensure absolute path from project root or current file
  const swaggerPath = path.resolve(__dirname, "..", "src", "swagger", "swagger.yaml");
  const fallbackPath = path.join(__dirname, "swagger", "swagger.yaml");

  let finalSwaggerDoc: any;

  if (existsSync(swaggerPath)) {
    finalSwaggerDoc = YAML.load(swaggerPath);
    logger.info(`✅ Loaded Swagger documentation from ${swaggerPath}`);
  } else if (existsSync(fallbackPath)) {
    finalSwaggerDoc = YAML.load(fallbackPath);
    logger.info(`✅ Loaded Swagger documentation from ${fallbackPath}`);
  } else {
    logger.warn(`⚠️ Swagger file not found at ${swaggerPath} or ${fallbackPath}`);
    finalSwaggerDoc = swaggerSpec;
  }

  // Merge JSDoc specs if they exist
  if (finalSwaggerDoc && swaggerSpec.paths) {
    finalSwaggerDoc.paths = { ...finalSwaggerDoc.paths, ...swaggerSpec.paths };
    if (swaggerSpec.components) {
      finalSwaggerDoc.components = { ...finalSwaggerDoc.components, ...swaggerSpec.components };
    }
  }

  // Ensure server URL is correct
  if (finalSwaggerDoc.servers && finalSwaggerDoc.servers[0]) {
    finalSwaggerDoc.servers[0].url = `http://localhost:${PORT}`;
  }

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(finalSwaggerDoc, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: "Restaurant RAG API Docs",
  }));
} catch (error) {
  logger.error("❌ Error initializing Swagger:", error);
  // Safe fallback to basic spec
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Routes
app.use("/api", routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
