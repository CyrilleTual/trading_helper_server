import { Router } from "express";
import { getGlobalDashboard, getOnePortfolioDashboard } from "../../controller/portfolio.js";

const router = Router();


router.get("/dashboard/global", getGlobalDashboard)
router.get("/dashboard/:id", getOnePortfolioDashboard); 

export default router;
