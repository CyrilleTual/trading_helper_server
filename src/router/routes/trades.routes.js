import { Router } from "express";
import { exitPrepare, getAll, getByUser, newEntry } from "../../controller/trade.js";


const router = Router();


router.get("/active", getAll);
router.get("/activeByUser/:userId", getByUser);
router.post("/newEntry", newEntry); 
router.get("/exitPrepare/:tradeId", exitPrepare)

export default router;
