import {Router} from "express";
import test_routes from "./routes/test.routes.js"
import users_routes from "./routes/users.routes.js"
import trades_routes from "./routes/trades.routes.js"
 
const router = Router();

router.use ("/test", test_routes);
router.use ("/user", users_routes);
router.use ("/trade", trades_routes);


router.get("*", (req, res) => {
  res.send("là, c'est un 404");
});


///export default createRouter(pool) {}

export default router 