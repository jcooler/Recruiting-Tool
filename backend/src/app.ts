import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import candidatesRoutes from "./routes/candidates";
import morgan from "morgan";
import createHttpError, { isHttpError } from "http-errors";
import userRoutes from "./routes/users";
import session from "express-session";
import env from "./util/validateEnv";
import MongoStore from "connect-mongo";
import { requiresAuth } from "./middleware/auth";
import cors from "cors"; 

const app = express();

app.use(cors({
  origin: 'https://applicantwizard.vercel.app',
  credentials: true,
}));

app.use(morgan("dev"));

app.get('/', (req, res) => {
  res.status(200).send('Test endpoint is working');
});

app.use(express.json());

app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 60 * 60 * 1000, // 1 hour
  },
  rolling: true,
  store: MongoStore.create({
      mongoUrl: env.MONGODB_URI
  }),
}));

app.use("/api/users", userRoutes);
app.use("/api/candidates", requiresAuth, candidatesRoutes);

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
