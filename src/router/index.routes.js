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

router.use("/test", test_routes);
router.use("/user", users_routes);
router.use("/trade", auth, trades_routes);
router.use("/portfolio", auth, portfolio_routes);
router.use("/strategies", auth, strategies_routes);
router.use("/stock", auth, stock_route);
router.use("/currencies", auth, currencies_routes)

router.get("*", (req, res) => {
  res.send("là, c'est un 404");
});

///export default createRouter(pool) {}

export default router;
