"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.uploadSingle = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const allowedExtensions = process.env.ALLOWED_EXTENSIONS?.split(',') || ['.zip', '.tar.gz', '.bak'];
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600');
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const originalName = file.originalname;
        const extension = path_1.default.extname(originalName);
        const baseName = path_1.default.basename(originalName, extension);
        const filename = `${baseName}_${timestamp}${extension}`;
        cb(null, filename);
    }
});
const fileFilter = (req, file, cb) => {
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Extensão de arquivo não permitida. Permitidas: ${allowedExtensions.join(', ')}`));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: maxFileSize
    }
});
exports.uploadSingle = exports.upload.single('backup');
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 100MB' });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Campo de arquivo inválido' });
        }
    }
    if (error.message.includes('Extensão de arquivo não permitida')) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro no upload do arquivo' });
};
exports.handleUploadError = handleUploadError;
//# sourceMappingURL=upload.js.map