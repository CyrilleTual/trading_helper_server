import { Router } from "express";
import { getGlobalDashboard, getGlobalDashboardOfOneUser, getOnePortfolioDashboard, getPortfoliosByUser } from "../../controller/portfolio.js";

const router = Router();


router.get("/dashboard/global", getGlobalDashboard)
router.get("/dashboard/:idPortfolio", getOnePortfolioDashboard); 
router.get("/user/:userId", getPortfoliosByUser) // retourne les portfolios d'un user
router.get("/dashBoard/user/global/:userId", getGlobalDashboardOfOneUser) // le dashboard global d'un user

export default router;
