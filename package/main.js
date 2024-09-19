const fs = require('fs');
const path = require('path');

// Función para cargar el idioma desde lang.json
function getDefaultLanguage() {
    try {
        const { language } = JSON.parse(fs.readFileSync('lang.json', 'utf-8'));
        return language || 'en';
    } catch (error) {
        console.error('Error loading default language:', error);
        return 'en';
    }
}

// Función para cargar traducciones para un idioma específico
function loadTranslations(lang) {
    try {
        const translations = JSON.parse(fs.readFileSync('translations.json', 'utf-8'))[lang] || {};
        return translations;
    } catch (error) {
        console.error('Error loading translations:', error);
        return {};
    }
}

// Función de traducción
function translate(key, translations) {
    return translations[key] || key;
}

// Crear directorio si no existe
function createDirectories(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Exportar paquete
function exportPackage(folderPath, translations) {
    const exportFilePath = path.join(folderPath, 'package.npmjs');
    const filesToExport = [];

    function listFiles(currentPath) {
        const files = fs.readdirSync(currentPath, { withFileTypes: true });
        files.forEach(file => {
            const fullPath = path.join(currentPath, file.name);
            if (file.isDirectory()) {
                filesToExport.push(`&%${path.relative(folderPath, fullPath)}`);
                listFiles(fullPath);
            } else {
                filesToExport.push(`@${path.relative(folderPath, fullPath)}`);
                filesToExport.push('*');
                filesToExport.push(fs.readFileSync(fullPath, 'utf-8'));
                filesToExport.push('*');
            }
        });
    }

    listFiles(folderPath);

    fs.writeFileSync(exportFilePath, filesToExport.join('\n'));
    console.log(translate('exported_to', translations), exportFilePath);
}

// Importar paquete
function importPackage(npmjsFilePath, translations) {
    const content = fs.readFileSync(npmjsFilePath, 'utf-8');
    const lines = content.split('\n');
    let currentDirectory = null;

    lines.forEach((line, index) => {
        line = line.trim();

        if (line.startsWith('&%')) {
            currentDirectory = line.slice(2);
            createDirectories(currentDirectory);
            console.log(translate('created_directory', translations), currentDirectory);
        }
        else if (line.startsWith('@')) {
            const fileName = line.slice(1);
            const filePath = path.join(currentDirectory, fileName);

            let fileContent = '';
            for (let i = index + 1; i < lines.length; i++) {
                const nextLine = lines[i].trim();
                if (nextLine === '*') break;
                fileContent += nextLine + '\n';
            }

            createDirectories(path.dirname(filePath));
            fs.writeFileSync(filePath, fileContent.trim());
            console.log(translate('imported_file', translations), filePath);
        }
    });
}

// Crear paquete
function createPackage(folderPath, translations) {
    const structure = [
        '@iindex.js',
        '@ppackage.json'
    ];

    const packageJsonTemplate = {
        name: "my-package",
        version: "1.0.0",
        description: "Description of your package",
        author: "Your Name <your.email@example.com>",
        license: "ISC"
    };

    structure.forEach(item => {
        const isDirectory = item.startsWith('&%');
        const relativePath = item.slice(2);

        if (isDirectory) {
            createDirectories(path.join(folderPath, relativePath));
            console.log(translate('created_directory', translations), relativePath);
        } else {
            const filePath = path.join(folderPath, relativePath);
            createDirectories(path.dirname(filePath));
            fs.writeFileSync(filePath, `// ${path.basename(filePath)} content`);
            console.log(translate('created_file', translations), relativePath);
        }

        if (relativePath === "package.json" || relativePath === "ppackage.json") {
            const packageJsonPath = path.join(folderPath, relativePath);
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonTemplate, null, 2));
            console.log(translate('created_package_json', translations));
        }
    });
}

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);
const langIndex = args.indexOf('--lang');
const lang = langIndex !== -1 && langIndex + 1 < args.length ? args[langIndex + 1] : getDefaultLanguage();
const command = args.find(arg => ['--export', '--import', '--create'].includes(arg)) || '';
const folderPath = args[args.indexOf(command) + 1] || '';

// Cambiar idioma si --lang es proporcionado
if (langIndex !== -1) {
    fs.writeFileSync('lang.json', JSON.stringify({ language: lang }, null, 2));
    console.log(`Language set to ${lang}`);
}

// Cargar traducciones
const translations = loadTranslations(lang);

// Ejecutar comandos
if (command === '--export') {
    exportPackage(folderPath, translations);
} else if (command === '--import') {
    importPackage(folderPath, translations);
} else if (command === '--create') {
    createPackage(folderPath, translations);
} else if (command === '--discord') {
    console.log("https://discord.gg/s4mWXUCDMf");
} else {
    console.log(translate('usage', translations));
    console.log(translate('create_command', translations));
    console.log(translate('export_command', translations));
    console.log(translate('import_command', translations));
    console.log("node main --lang es");
    console.log("node main --lang en");
    console.log("node main --discord");
}
