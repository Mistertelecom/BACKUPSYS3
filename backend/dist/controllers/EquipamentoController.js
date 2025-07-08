"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipamentoController = exports.equipamentoValidation = void 0;
const express_validator_1 = require("express-validator");
const Equipamento_1 = require("../models/Equipamento");
const Backup_1 = require("../models/Backup");
exports.equipamentoValidation = [
    (0, express_validator_1.body)('nome').notEmpty().withMessage('Nome é obrigatório'),
    (0, express_validator_1.body)('ip').notEmpty().withMessage('IP é obrigatório').isIP().withMessage('IP inválido'),
    (0, express_validator_1.body)('tipo').notEmpty().withMessage('Tipo é obrigatório')
];
class EquipamentoController {
    static async getAll(req, res) {
        try {
            const equipamentos = await Equipamento_1.EquipamentoModel.getWithBackupCount();
            res.json(equipamentos);
        }
        catch (error) {
            console.error('Erro ao buscar equipamentos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const equipamento = await Equipamento_1.EquipamentoModel.getById(parseInt(id));
            if (!equipamento) {
                res.status(404).json({ error: 'Equipamento não encontrado' });
                return;
            }
            res.json(equipamento);
        }
        catch (error) {
            console.error('Erro ao buscar equipamento:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async create(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            const { nome, ip, tipo } = req.body;
            const equipamento = await Equipamento_1.EquipamentoModel.create({ nome, ip, tipo });
            res.status(201).json(equipamento);
        }
        catch (error) {
            console.error('Erro ao criar equipamento:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async update(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            const { id } = req.params;
            const { nome, ip, tipo } = req.body;
            const equipamento = await Equipamento_1.EquipamentoModel.update(parseInt(id), { nome, ip, tipo });
            if (!equipamento) {
                res.status(404).json({ error: 'Equipamento não encontrado' });
                return;
            }
            res.json(equipamento);
        }
        catch (error) {
            console.error('Erro ao atualizar equipamento:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const deleted = await Equipamento_1.EquipamentoModel.delete(parseInt(id));
            if (!deleted) {
                res.status(404).json({ error: 'Equipamento não encontrado' });
                return;
            }
            res.json({ message: 'Equipamento deletado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao deletar equipamento:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getBackups(req, res) {
        try {
            const { id } = req.params;
            const backups = await Backup_1.BackupModel.getByEquipamentoId(parseInt(id));
            res.json(backups);
        }
        catch (error) {
            console.error('Erro ao buscar backups do equipamento:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.EquipamentoController = EquipamentoController;
//# sourceMappingURL=EquipamentoController.js.map