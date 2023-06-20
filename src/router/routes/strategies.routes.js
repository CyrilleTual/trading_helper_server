import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { getStrategiesByUser } from "../../controller/strategies.js";

const router = Router();

router.get("/user/:userId", getStrategiesByUser); // 
//router.get("/:isin&:place", auth, displayOneStock); // middleware de verif du token sur la route

export default router;
