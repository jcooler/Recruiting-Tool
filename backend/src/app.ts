import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import candidateRoutes from "./routes/candidates";
import morgan from "morgan";
import createHttpError, { isHttpError } from "http-errors";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors');

const app = express();

app.use(cors());

app.use(morgan("dev"));

app.use(express.json());

app.use("/api/candidates", candidateRoutes);

app.use((req, res, next) => {
  next(createHttpError(404,"Not found"));
});


// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(error);
  let errorMessage = "An unknown error occurred";
  let statusCode = 500;
  if (isHttpError(error)) {
    statusCode = error.status;
    errorMessage = error.message;
    res.status(statusCode).json({ error: errorMessage });
  }
});

export default app;
