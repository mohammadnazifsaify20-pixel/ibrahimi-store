const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const secret = 'supersecretdevkey123456789';

try {
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    if (!content.includes('JWT_SECRET=')) {
        const newContent = content + `\nJWT_SECRET=${secret}\n`;
        fs.writeFileSync(envPath, newContent);
        console.log('✅ Added JWT_SECRET to .env');
    } else {
        console.log('ℹ️ JWT_SECRET already exists in .env');
    }
} catch (error) {
    console.error('❌ Failed to update .env:', error);
}
