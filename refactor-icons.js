const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(path.join(__dirname, 'src'), (filePath) => {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Regex to match: import { Icon1, Icon2 as Something } from '@mui/icons-material';
    // Handles multiline imports as well.
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@mui\/icons-material['"];/g;

    content = content.replace(importRegex, (match, p1) => {
        changed = true;
        const icons = p1.split(',').map(s => s.trim()).filter(Boolean);
        const newImports = icons.map(iconDef => {
            // Handle "Icon as Alias"
            const parts = iconDef.split(/\s+as\s+/);
            if (parts.length === 2) {
                return `import ${parts[1]} from '@mui/icons-material/${parts[0]}';`;
            }
            return `import ${iconDef} from '@mui/icons-material/${iconDef}';`;
        });
        return newImports.join('\n');
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Refactored icons in ${filePath}`);
    }
});
