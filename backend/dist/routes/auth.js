"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/login', AuthController_1.loginValidation, AuthController_1.AuthController.login);
router.get('/validate', auth_1.authenticateToken, AuthController_1.AuthController.validateToken);
exports.default = router;
//# sourceMappingURL=auth.js.map