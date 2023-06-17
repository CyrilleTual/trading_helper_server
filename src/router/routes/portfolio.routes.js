import { Router } from "express";
import { getOnePortfolioDashboard } from "../../controller/portfolio.js";

const router = Router();

router.get("/dashboard/:id", getOnePortfolioDashboard);
 
export default router;
