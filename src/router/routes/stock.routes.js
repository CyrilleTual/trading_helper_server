import { Router } from "express";
import { lastQuote, searchStock } from "../../controller/stock.js";
const router = Router();

router.get("/find/:title", searchStock );
router.get("/last/:isin&:place", lastQuote);

export default router;
