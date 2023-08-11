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

router.get("/active", getAll);
router.get("/activeByUser/:userId", getByUser);
router.get("/checkIfActive/:idStock&:idPortfolio", checkIfActiveTrade);
router.post("/newEntry", newEntry);
router.get("/:tradeId/prepare", exitPrepare); // aussi valable pour reEnter
router.post("/exitProcess/", exitProcess);
router.post("/reEnter", reEnterProcess);

export default router;
