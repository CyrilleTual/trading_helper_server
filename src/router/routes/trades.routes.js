import { Router } from "express";
import {
  adjustmentProcess,
  checkIfActiveTrade,
  movements,
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
router.get("/:tradeId/movements", movements);   // retourne les mouvements sur un trade {enters, exits, adjustments}
router.post("/newEntry", newEntry); // creation d'un trade 
router.post("/exitProcess", exitProcess); // vente d'un actif
router.post("/reEnter", reEnterProcess); // re-enter sur un actif
router.post("/adjustment", adjustmentProcess); // ajustements tp et stop sur un actif

export default router;
