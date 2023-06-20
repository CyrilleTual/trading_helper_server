import { Router } from "express";
import { checkActive, lastQuote, searchStock } from "../../controller/stock.js";
const router = Router();

router.get("/find/:title", searchStock );
router.get("/last/:isin&:place", lastQuote);
router.get("/checkActive/:id", checkActive);

export default router;
