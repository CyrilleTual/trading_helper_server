import { Router } from "express";
import { displayOneStock, testview } from "../../controller/test.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

router.get("/", testview);
router.get("/:isin&:place",auth, displayOneStock); // middleware de verif du token sur la route

export default router; 