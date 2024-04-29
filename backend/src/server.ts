import app from "./app";
import env from "./util/validateEnv";
import mongoose from "mongoose";




const port = process.env.PORT;


mongoose.connect(env.MONGO_CONNECTION_STRING)
.then(() => {
  console.log("Connected to MongoDB");

  app.listen(port, () => {
    console.log("Server is running flawlessly on port " + port);
  });
})
.catch(console.error);
