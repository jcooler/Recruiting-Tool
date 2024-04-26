import { RequestHandler } from "express";
import createHttpError from "http-errors";

export const requiresAuth: RequestHandler = (req, res, next) => {
  console.log("Authenticated user session ID:", req.session.userId);
if (req.session.userId) {
next();
} else {
  next(createHttpError(401, "You must be logged in to access this resource"));
}
};