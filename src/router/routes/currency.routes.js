import { Router } from "express";
import { getCurrencies } from "../../controller/currency.js";

const router = Router();

router.get("/", getCurrencies); // récupère les monnaies

export default router;
