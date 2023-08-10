import { Router } from "express";
import { getDetailsOfOnePorfolio, getGlobalDashboardOfOneUser, getOnePortfolioDashboard, getPortfoliosByUser, newPortfolio, deposit, idlePortfolio } from "../../controller/portfolio.js";

const router = Router();

// router.get("/dashboard/global", getGlobalDashboard)
router.get("/dashboard/:idPortfolio", getOnePortfolioDashboard); // dashboard d'un portfolio
router.get("/user/:userId", getPortfoliosByUser) // retourne la liste des portfolios d'un user
router.get("/dashBoard/user/global/:userId", getGlobalDashboardOfOneUser) // le dashboard global d'un user
router.get("/details/:idPortfolio", getDetailsOfOnePorfolio) // le detail d'un portfolio par id de portfolio
router.post("/new", newPortfolio) // creation d'un nouveau portfolio 
router.post("/deposit", deposit) // depôt ou retrait du un portefeuille
router.put("/:idPortfolio/idle", idlePortfolio); // desactive un portfolio

export default router;
