import { Router } from "express";
import { checkActive, lastQuote, searchStock } from "../../controller/stock.js";
const router = Router();

router.get("/:title/find", searchStock);
router.get("/:isin&:place/last", lastQuote);
//router.get("/checkActive/:id", checkActive);

export default router;
