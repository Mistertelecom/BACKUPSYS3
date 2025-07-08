"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BackupController_1 = require("../controllers/BackupController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/', BackupController_1.BackupController.getAll);
router.get('/recent', BackupController_1.BackupController.getRecent);
router.get('/:id', BackupController_1.BackupController.getById);
router.post('/equipamento/:equipamentoId', upload_1.uploadSingle, upload_1.handleUploadError, BackupController_1.BackupController.upload);
router.get('/:id/download', BackupController_1.BackupController.download);
router.delete('/:id', BackupController_1.BackupController.delete);
exports.default = router;
//# sourceMappingURL=backups.js.map