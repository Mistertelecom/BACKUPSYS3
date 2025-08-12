"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupController = void 0;
const Backup_1 = require("../models/Backup");
const Equipamento_1 = require("../models/Equipamento");
const Provider_1 = require("../models/Provider");
const ProviderService_1 = require("../services/ProviderService");
const fileTypeDetector_1 = require("../utils/fileTypeDetector");
const DropboxProvider_1 = require("../services/providers/DropboxProvider");
const GoogleDriveProvider_1 = require("../services/providers/GoogleDriveProvider");
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
            const { providerId } = req.body;
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
            let provider;
            if (providerId) {
                provider = await Provider_1.ProviderModel.getById(parseInt(providerId));
                if (!provider || !provider.is_active) {
                    fs_1.default.unlinkSync(file.path);
                    res.status(400).json({ error: 'Provider inválido ou inativo' });
                    return;
                }
            }
            else {
                provider = await Provider_1.ProviderModel.getByType('local');
                if (!provider) {
                    fs_1.default.unlinkSync(file.path);
                    res.status(500).json({ error: 'Provider local não encontrado' });
                    return;
                }
            }
            if (!fileTypeDetector_1.FileTypeDetector.validateFileForEquipment(file.originalname, equipamento.tipo)) {
                const fileTypeInfo = fileTypeDetector_1.FileTypeDetector.getFileTypeInfo(file.originalname);
                const detectedType = fileTypeInfo ? fileTypeInfo.equipment : 'Desconhecido';
                fs_1.default.unlinkSync(file.path);
                res.status(400).json({
                    error: `Arquivo não é compatível com o tipo de equipamento. Tipo detectado: ${detectedType}, Equipamento: ${equipamento.tipo}`
                });
                return;
            }
            const providerInstance = await ProviderService_1.providerService.initializeProvider(provider);
            const uploadResult = await providerInstance.uploadFile(file, parseInt(equipamentoId));
            const fileTypeInfo = fileTypeDetector_1.FileTypeDetector.getFileTypeInfo(file.originalname);
            const detectedEquipmentType = fileTypeDetector_1.FileTypeDetector.detectEquipmentType(file.originalname);
            const backup = await Backup_1.BackupModel.create({
                equipamento_id: parseInt(equipamentoId),
                nome_arquivo: file.originalname,
                caminho: file.path,
                provider_type: provider.type,
                provider_path: uploadResult.provider_path,
                file_size: uploadResult.file_size,
                checksum: uploadResult.checksum,
                status: 'active'
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
            const backupId = parseInt(id);
            if (isNaN(backupId) || backupId <= 0) {
                res.status(400).json({ error: 'ID do backup inválido' });
                return;
            }
            const backup = await Backup_1.BackupModel.getById(backupId);
            if (!backup) {
                res.status(404).json({ error: 'Backup não encontrado' });
                return;
            }
            if (backup.status !== 'active') {
                res.status(403).json({ error: 'Backup não está disponível para download' });
                return;
            }
            const provider = await Provider_1.ProviderModel.getByType(backup.provider_type);
            if (!provider) {
                res.status(500).json({ error: 'Provider não encontrado' });
                return;
            }
            if (!provider.is_active) {
                res.status(403).json({ error: 'Provider está inativo' });
                return;
            }
            try {
                const providerInstance = await ProviderService_1.providerService.initializeProvider(provider);
                const fileBuffer = await providerInstance.downloadFile(backup.provider_path || backup.caminho);
                if (backup.file_size && fileBuffer.length !== backup.file_size) {
                    console.warn(`File size mismatch for backup ${backupId}: expected ${backup.file_size}, got ${fileBuffer.length}`);
                }
                const safeFilename = path_1.default.basename(backup.nome_arquivo).replace(/[^a-zA-Z0-9.-]/g, '_');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Length', fileBuffer.length);
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                console.log(`Download iniciado - Backup ID: ${backupId}, Arquivo: ${backup.nome_arquivo}, Usuário: ${req.user?.id}`);
                res.send(fileBuffer);
            }
            catch (providerError) {
                console.error('Erro no provider:', providerError);
                if (backup.provider_type === 'local' && backup.caminho) {
                    const filePath = path_1.default.resolve(backup.caminho);
                    const uploadsDir = path_1.default.resolve(__dirname, '../../uploads');
                    if (!filePath.startsWith(uploadsDir)) {
                        res.status(403).json({ error: 'Acesso negado ao arquivo' });
                        return;
                    }
                    if (fs_1.default.existsSync(filePath)) {
                        const safeFilename = path_1.default.basename(backup.nome_arquivo).replace(/[^a-zA-Z0-9.-]/g, '_');
                        res.download(filePath, safeFilename);
                        return;
                    }
                }
                res.status(404).json({ error: 'Arquivo de backup não encontrado' });
            }
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
    static async syncToCloud(req, res) {
        try {
            const { id } = req.params;
            const { provider_id } = req.body;
            const backupId = parseInt(id);
            const providerId = parseInt(provider_id);
            if (isNaN(backupId) || isNaN(providerId)) {
                res.status(400).json({
                    success: false,
                    error: 'IDs de backup e provider são obrigatórios'
                });
                return;
            }
            const backup = await Backup_1.BackupModel.getById(backupId);
            if (!backup) {
                res.status(404).json({
                    success: false,
                    error: 'Backup não encontrado'
                });
                return;
            }
            const provider = await Provider_1.ProviderModel.getById(providerId);
            if (!provider || !provider.is_active) {
                res.status(400).json({
                    success: false,
                    error: 'Provider inválido ou inativo'
                });
                return;
            }
            if (!fs_1.default.existsSync(backup.caminho)) {
                res.status(404).json({
                    success: false,
                    error: 'Arquivo de backup não encontrado no sistema'
                });
                return;
            }
            console.log(`🔄 Iniciando sincronização do backup ${backup.nome_arquivo} para ${provider.name}`);
            await Backup_1.BackupModel.updateSyncStatus(backupId, 'syncing', providerId);
            try {
                let uploadResult;
                const config = JSON.parse(provider.config);
                if (provider.type === 'dropbox') {
                    const dropboxProvider = new DropboxProvider_1.DropboxProvider(config);
                    uploadResult = await dropboxProvider.uploadFile(backup.caminho, backup.nome_arquivo);
                }
                else if (provider.type === 'google-drive') {
                    const googleDriveProvider = new GoogleDriveProvider_1.GoogleDriveProvider(config);
                    uploadResult = await googleDriveProvider.uploadFile(backup.caminho, backup.nome_arquivo);
                }
                else {
                    const providerInstance = await ProviderService_1.providerService.initializeProvider(provider);
                    const file = {
                        path: backup.caminho,
                        originalname: backup.nome_arquivo,
                        size: backup.file_size || 0
                    };
                    const legacyResult = await providerInstance.uploadFile(file, backup.equipamento_id);
                    uploadResult = {
                        success: true,
                        remotePath: legacyResult.provider_path,
                        size: legacyResult.file_size
                    };
                }
                if (uploadResult.success) {
                    const remotePath = 'remotePath' in uploadResult ? uploadResult.remotePath :
                        'fileId' in uploadResult ? `gd://${uploadResult.fileId}` :
                            'unknown';
                    await Backup_1.BackupModel.updateSyncStatus(backupId, 'synced', providerId, remotePath, null);
                    console.log(`✅ Backup sincronizado com sucesso: ${remotePath}`);
                    res.json({
                        success: true,
                        message: 'Backup sincronizado com sucesso',
                        sync_path: remotePath,
                        sync_date: new Date().toISOString()
                    });
                }
                else {
                    throw new Error(uploadResult.error || 'Falha no upload');
                }
            }
            catch (syncError) {
                console.error(`❌ Erro na sincronização:`, syncError);
                await Backup_1.BackupModel.updateSyncStatus(backupId, 'failed', providerId, null, syncError.message);
                res.status(500).json({
                    success: false,
                    error: syncError.message || 'Erro na sincronização'
                });
            }
        }
        catch (error) {
            console.error('Erro crítico na sincronização:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
}
exports.BackupController = BackupController;
//# sourceMappingURL=BackupController.js.map