export interface User {
    id?: number;
    username: string;
    password: string;
    role?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}
export declare class UserModel {
    static findByUsername(username: string): Promise<User | null>;
    static findById(id: number): Promise<User | null>;
    static create(userData: Omit<User, 'id' | 'created_at'>): Promise<User>;
    static validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    static getAllUsers(): Promise<User[]>;
}
//# sourceMappingURL=User.d.ts.map