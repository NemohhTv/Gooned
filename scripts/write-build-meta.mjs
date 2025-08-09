import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('public', { recursive: true });
writeFileSync('public/build.json', JSON.stringify({ builtAt: Date.now() }));
