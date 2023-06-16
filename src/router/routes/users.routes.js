import { Router } from "express";

import { signup, signin } from "../../controller/user.js";
//import { auth } from "../../middlewares/auth.js";

const router = Router();

//router.get("/checkToken", auth, checkToken);
router.post("/signup", signup);
router.post("/signin", signin);

export default router;
