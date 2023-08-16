import { Router } from "express";
import { getCurrencies } from "../../controller/currency.js";

const router = Router();

router.get("/", getCurrencies);

export default router;
