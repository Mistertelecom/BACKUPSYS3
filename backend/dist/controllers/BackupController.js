"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupController = void 0;
const Backup_1 = require("../models/Backup");
const Equipamento_1 = require("../models/Equipamento");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class BackupController {
    static async getAll(req, res) {
        try {
            const backups = await Backup_1.BackupModel.getWithEquipamento();
            res.json(backups);
        }
        catch (error) {
            console.error('Erro ao buscar backups:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const backup = await Backup_1.BackupModel.getById(parseInt(id));
            if (!backup) {
                res.status(404).json({ error: 'Backup não encontrado' });
                return;
            }
            res.json(backup);
        }
        catch (error) {
            console.error('Erro ao buscar backup:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async upload(req, res) {
        try {
            const { equipamentoId } = req.params;
            const file = req.file;
            if (!file) {
                res.status(400).json({ error: 'Arquivo de backup é obrigatório' });
                return;
            }
            const equipamento = await Equipamento_1.EquipamentoModel.getById(parseInt(equipamentoId));
            if (!equipamento) {
                fs_1.default.unlinkSync(file.path);
                res.status(404).json({ error: 'Equipamento não encontrado' });
                return;
            }
            const backup = await Backup_1.BackupModel.create({
                equipamento_id: parseInt(equipamentoId),
                nome_arquivo: file.originalname,
                caminho: file.path
            });
            res.status(201).json(backup);
        }
        catch (error) {
            console.error('Erro ao fazer upload do backup:', error);
            if (req.file) {
                fs_1.default.unlinkSync(req.file.path);
            }
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async download(req, res) {
        try {
            const { id } = req.params;
            const backup = await Backup_1.BackupModel.getById(parseInt(id));
            if (!backup) {
                res.status(404).json({ error: 'Backup não encontrado' });
                return;
            }
            const filePath = path_1.default.resolve(backup.caminho);
            if (!fs_1.default.existsSync(filePath)) {
                res.status(404).json({ error: 'Arquivo de backup não encontrado no servidor' });
                return;
            }
            res.download(filePath, backup.nome_arquivo, (err) => {
                if (err) {
                    console.error('Erro no download:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
                    }
                }
            });
        }
        catch (error) {
            console.error('Erro ao fazer download do backup:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const backup = await Backup_1.BackupModel.getById(parseInt(id));
            if (!backup) {
                res.status(404).json({ error: 'Backup não encontrado' });
                return;
            }
            const filePath = path_1.default.resolve(backup.caminho);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            const deleted = await Backup_1.BackupModel.delete(parseInt(id));
            if (!deleted) {
                res.status(404).json({ error: 'Backup não encontrado' });
                return;
            }
            res.json({ message: 'Backup deletado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao deletar backup:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getRecent(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const backups = await Backup_1.BackupModel.getRecentBackups(limit);
            res.json(backups);
        }
        catch (error) {
            console.error('Erro ao buscar backups recentes:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.BackupController = BackupController;
//# sourceMappingURL=BackupController.js.map