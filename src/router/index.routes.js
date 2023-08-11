import { Router } from "express";
import test_routes from "./routes/test.routes.js";
import users_routes from "./routes/users.routes.js";
import trades_routes from "./routes/trades.routes.js";
import portfolio_routes from "./routes/portfolio.routes.js";
import strategies_routes from "./routes/strategies.routes.js";
import stock_route from "./routes/stock.routes.js";
import currencies_routes from "./routes/currency.routes.js"
import { auth } from "../middleware/auth.js";

const router = Router();
const apiUrl = process.env.API_BASE_URL;

// auth -> middleWare de vérificartion du token : routes sécurisées

router.use(`${apiUrl}/test`, auth, test_routes);
router.use(`${apiUrl}/users`, users_routes);
router.use(`${apiUrl}/trades`, auth, trades_routes);
router.use(`${apiUrl}/portfolios`, auth, portfolio_routes);
router.use(`${apiUrl}/strategies`, auth, strategies_routes);
router.use(`${apiUrl}/stocks`, auth, stock_route);
router.use(`${apiUrl}/currencies`, auth, currencies_routes);

router.get(`*`, (req, res) => {
  res.send(`là, c'est un 404`);
});


export default router;
