"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EquipamentoController_1 = require("../controllers/EquipamentoController");
const auth_1 = require("../middlewares/auth");
const permissions_1 = require("../middlewares/permissions");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.use((0, permissions_1.checkUserActive)());
router.get('/', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.EQUIPAMENTOS_READ), EquipamentoController_1.EquipamentoController.getAll);
router.get('/:id', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.EQUIPAMENTOS_READ), EquipamentoController_1.EquipamentoController.getById);
router.post('/', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.EQUIPAMENTOS_CREATE), EquipamentoController_1.equipamentoValidation, EquipamentoController_1.EquipamentoController.create);
router.put('/:id', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.EQUIPAMENTOS_UPDATE), EquipamentoController_1.equipamentoValidation, EquipamentoController_1.EquipamentoController.update);
router.delete('/:id', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.EQUIPAMENTOS_DELETE), EquipamentoController_1.EquipamentoController.delete);
router.get('/:id/backups', (0, permissions_1.checkPermission)(permissions_1.PERMISSIONS.BACKUPS_READ), EquipamentoController_1.EquipamentoController.getBackups);
exports.default = router;
//# sourceMappingURL=equipamentos.js.map