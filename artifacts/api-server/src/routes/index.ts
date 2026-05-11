import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dbSetupRouter from "./db-setup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dbSetupRouter);

export default router;
