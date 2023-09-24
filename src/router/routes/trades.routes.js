import { Router } from "express";
import {
  adjustmentProcess,
  checkIfActiveTrade,
  exitPrepare,
  exitProcess,
  getAll,
  getActivesByUser,
  newEntry,
  reEnterProcess,
} from "../../controller/trade.js";

const router = Router();

router.get("/active", getAll); // tous les trades actifs -> pour admin 
router.get("/activesByUser/:userId", getActivesByUser);
router.get("/checkIfActive/:idStock&:idPortfolio", checkIfActiveTrade);
router.get("/:tradeId/prepare", exitPrepare); // Also valid for reEnter
router.post("/newEntry", newEntry); // creation d'un trade 
router.post("/exitProcess", exitProcess); // vente d'un actif
router.post("/reEnter", reEnterProcess); // re-enter sur un actif
router.post("/adjustment", adjustmentProcess); // ajustements tp et stop sur un actif

export default router;
