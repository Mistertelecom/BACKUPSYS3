import sqlite3 from 'sqlite3';
export declare class Database {
    private db;
    constructor();
    private initTables;
    private runMigrations;
    private createDefaultRoles;
    private createDefaultUser;
    private createDefaultProviders;
    getDatabase(): sqlite3.Database;
    close(): void;
}
export declare const database: Database;
//# sourceMappingURL=database.d.ts.map