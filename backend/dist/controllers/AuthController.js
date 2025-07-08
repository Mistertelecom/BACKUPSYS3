"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = exports.loginValidation = void 0;
const express_validator_1 = require("express-validator");
const User_1 = require("../models/User");
const auth_1 = require("../middlewares/auth");
exports.loginValidation = [
    (0, express_validator_1.body)('username').notEmpty().withMessage('Username é obrigatório'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password é obrigatório')
];
class AuthController {
    static async login(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            const { username, password } = req.body;
            const user = await User_1.UserModel.findByUsername(username);
            if (!user) {
                res.status(401).json({ error: 'Credenciais inválidas' });
                return;
            }
            const isValidPassword = await User_1.UserModel.validatePassword(password, user.password);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Credenciais inválidas' });
                return;
            }
            const token = (0, auth_1.generateToken)(user.id);
            res.json({
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at
                }
            });
        }
        catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async validateToken(req, res) {
        try {
            const user = req.user;
            res.json({
                valid: true,
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at
                }
            });
        }
        catch (error) {
            console.error('Erro na validação do token:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map