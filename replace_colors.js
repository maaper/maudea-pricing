const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // 1. Primary buttons / elements
        content = content.replace(/bg-red-600/g, 'bg-emerald-700');
        content = content.replace(/hover:bg-red-700/g, 'hover:bg-emerald-800');
        content = content.replace(/focus:ring-red-500/g, 'focus:ring-emerald-600');
        content = content.replace(/focus:border-red-500/g, 'focus:border-emerald-600');
        content = content.replace(/text-red-600/g, 'text-emerald-700');

        // 2. Wizard gradients & totals
        content = content.replace(/from-red-600 to-red-800/g, 'from-emerald-700 to-emerald-900');
        content = content.replace(/text-red-400/g, 'text-emerald-500'); // total price small
        content = content.replace(/text-red-500 tracking-tight/g, 'text-emerald-500 tracking-tight'); // total price big default

        // 3. Revert specific ERROR / NEGATIVE usages back to red!
        // Settings message
        content = content.replace(/message\.type === 'success' \? 'text-green-600' : 'text-emerald-700'/g, "message.type === 'success' ? 'text-green-600' : 'text-red-600'");

        // Tables
        content = content.replace(/text-emerald-700 hover:text-red-900/g, 'text-red-600 hover:text-red-900'); // Delete buttons standard
        content = content.replace(/text-emerald-700 hover:text-red-800/g, 'text-red-600 hover:text-red-900'); // Delete alternative

        // Reject statuses
        content = content.replace(/bg-emerald-100 text-red-800/g, 'bg-red-100 text-red-800'); // Operation rejected
        content = content.replace(/text-emerald-700 bg-red-50/g, 'text-red-700 bg-red-50'); // Corporate tax step 4

        // Negative values
        content = content.replace(/totalBeneficio >= 0 \? 'text-green-600' : 'text-emerald-700'/g, "totalBeneficio >= 0 ? 'text-green-600' : 'text-red-600'");
        content = content.replace(/netBenefit \?\? 0\) >= 0 \? 'text-green-600' : 'text-emerald-700'/g, "netBenefit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'");

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
});
