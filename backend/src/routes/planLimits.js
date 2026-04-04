import { Router } from "express";
import { getPlanLimitsSnapshot } from "../services/planService.js";

const router = Router();

/** Public: document + text limits for marketing / Documents page (matches server enforcement). */
router.get("/limits", (_req, res) => {
  res.json(getPlanLimitsSnapshot());
});

export default router;
