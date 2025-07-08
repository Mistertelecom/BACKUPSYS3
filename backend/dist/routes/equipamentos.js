"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EquipamentoController_1 = require("../controllers/EquipamentoController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/', EquipamentoController_1.EquipamentoController.getAll);
router.get('/:id', EquipamentoController_1.EquipamentoController.getById);
router.post('/', EquipamentoController_1.equipamentoValidation, EquipamentoController_1.EquipamentoController.create);
router.put('/:id', EquipamentoController_1.equipamentoValidation, EquipamentoController_1.EquipamentoController.update);
router.delete('/:id', EquipamentoController_1.EquipamentoController.delete);
router.get('/:id/backups', EquipamentoController_1.EquipamentoController.getBackups);
exports.default = router;
//# sourceMappingURL=equipamentos.js.map