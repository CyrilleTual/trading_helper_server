import { Router } from "express";
import {
  checkIfActiveTrade,
  exitPrepare,
  exitProcess,
  getAll,
  getByUser,
  newEntry,
  reEnterProcess,
} from "../../controller/trade.js";

const router = Router();

router.get("/active", getAll); // tous les trades actifs -> pour admin 
router.get("/activeByUser/:userId", getByUser);
router.get("/checkIfActive/:idStock&:idPortfolio", checkIfActiveTrade);
router.post("/newEntry", newEntry);
router.get("/:tradeId/prepare", exitPrepare); // Also valid for reEnter
router.post("/exitProcess", exitProcess);
router.post("/reEnter", reEnterProcess);

export default router;
