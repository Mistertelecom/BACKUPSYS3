"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BackupController_1 = require("../controllers/BackupController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const permissions_1 = require("../middlewares/permissions");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.use((0, permissions_1.checkUserActive)());
router.get('/', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_READ), BackupController_1.BackupController.getAll);
router.get('/recent', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_READ), BackupController_1.BackupController.getRecent);
router.get('/:id', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_READ), BackupController_1.BackupController.getById);
router.post('/equipamento/:equipamentoId', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_CREATE), upload_1.uploadSingle, upload_1.handleUploadError, BackupController_1.BackupController.upload);
router.get('/:id/download', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_DOWNLOAD), BackupController_1.BackupController.download);
router.post('/:id/sync', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_UPDATE), BackupController_1.BackupController.syncToCloud);
router.delete('/:id', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_DELETE), BackupController_1.BackupController.delete);
exports.default = router;
//# sourceMappingURL=backups.js.map