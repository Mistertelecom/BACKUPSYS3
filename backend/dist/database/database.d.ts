import sqlite3 from 'sqlite3';
export declare class Database {
    private db;
    constructor();
    private initTables;
    private createDefaultUser;
    getDatabase(): sqlite3.Database;
    close(): void;
}
export declare const database: Database;
//# sourceMappingURL=database.d.ts.map