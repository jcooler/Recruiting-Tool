import app from "./app";
import mongoose from "mongoose";




const port = process.env.PORT || 5001;


mongoose.connect("mongodb+srv://jcooler:0034affF12121@cluster0.ikkffeu.mongodb.net/ApplicantWizard?retryWrites=true&w=majority&appName=Cluster0")
.then(() => {
  console.log("Connected to MongoDB");

  app.listen(port, () => {
    console.log("Server is running flawlessly on port " + port);
  });
})
.catch(console.error);
