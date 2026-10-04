import { Router, type IRouter } from "express";
import tuzakaiRouter from "./tuzakai";
import storeRouter from "./store";
import storePaymentsRouter from "./store-payments";

const router: IRouter = Router();

router.use(tuzakaiRouter);
router.use(storeRouter);
router.use(storePaymentsRouter);

export default router;
