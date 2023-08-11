import { Router } from "express";
import { signup, signin } from "../../controller/user.js";
 
// Attention les routes users ne sont pas protégées par verification du token 
// en amont

const router = Router();

//router.get("/checkToken", auth, checkToken);
router.post("/signup", signup);
router.post("/signin", signin);

export default router;
