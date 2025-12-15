// Mock database for development
import bcrypt from 'bcryptjs';

interface User {
    id: number;
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE' | 'ACCOUNTANT';
    createdAt: Date;
    updatedAt: Date;
}

let users: User[] = [];
let nextId = 1;

// Initialize with admin user
async function initializeUsers() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    users = [
        {
            id: nextId++,
            email: 'admin@example.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'ADMIN',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];
}

// Initialize on load
initializeUsers();

export const mockDb = {
    async findUserByEmail(email: string) {
        return users.find(u => u.email === email);
    },

    async findUserById(id: number) {
        return users.find(u => u.id === id);
    },

    async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
        const user: User = {
            ...data,
            id: nextId++,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        users.push(user);
        return user;
    },

    async updateUser(id: number, data: Partial<User>) {
        const user = users.find(u => u.id === id);
        if (!user) return null;
        Object.assign(user, { ...data, updatedAt: new Date() });
        return user;
    },
};
