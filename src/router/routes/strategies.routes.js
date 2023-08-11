import { Router } from "express";
import { getStrategiesByUser } from "../../controller/strategies.js";

const router = Router();

router.get("/user/:userId", getStrategiesByUser);

export default router;
