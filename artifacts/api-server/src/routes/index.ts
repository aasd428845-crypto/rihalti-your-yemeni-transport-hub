import { Router, type IRouter } from "express";
import healthRouter from "./health";
import smsRouter from "./sms";
import ridersRouter from "./riders";
import offersRouter from "./offers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(smsRouter);
router.use(ridersRouter);
router.use(offersRouter);

export default router;
