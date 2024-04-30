import { cleanEnv } from "envalid";
import { str } from "envalid/dist/validators";

export default cleanEnv(process.env, {
  MONGODB_URI: str(),
  SESSION_SECRET: str(),
});
