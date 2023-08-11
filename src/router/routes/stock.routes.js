import { Router } from "express";
import { lastInfos, searchStock } from "../../controller/stock.js";
const router = Router();

router.get("/:title/find", searchStock);
router.get("/:isin&:place/last", lastInfos);

export default router;
