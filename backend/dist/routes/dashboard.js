"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardController_1 = require("../controllers/DashboardController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/stats', DashboardController_1.DashboardController.getStats);
router.get('/equipamentos', DashboardController_1.DashboardController.getEquipamentoStats);
router.get('/providers/health', DashboardController_1.DashboardController.getProviderHealth);
router.get('/backup-jobs/stats', DashboardController_1.DashboardController.getBackupJobsStats);
exports.default = router;
//# sourceMappingURL=dashboard.js.map