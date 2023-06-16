import { Router } from "express";
import { getAll, getByUser, newEntry } from "../../controller/trade.js";


const router = Router();


router.get("/active", getAll);
router.get("/activeByUser/:userId", getByUser);
router.post("/newEntry", newEntry); 

export default router;
