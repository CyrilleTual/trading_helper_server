import { Router } from "express";
import { getStrategiesByUser, newStrategie} from "../../controller/strategies.js";

const router = Router();

router.get("/user/:userId", getStrategiesByUser);
router.post("/new", newStrategie);  

export default router;
