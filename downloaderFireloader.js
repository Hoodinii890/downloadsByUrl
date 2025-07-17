require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const tempDir = process.env.DOWNLOADS_TEMP_DIR || path.join(os.homedir(), 'Downloads'); // Ruta de descargas de Windows

const urls = [
    "https://www.fireload.com/b45e4f7a255a56c6/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_01_[Hakoniwa].mp4",
    "https://www.fireload.com/745fbb29b3ccdf5b/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_02_[Hakoniwa].mp4",
    "https://www.fireload.com/855405b1d0cb730a/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_03_[Hakoniwa].mp4",
    "https://www.fireload.com/d8f62024517d1402/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_04_[Hakoniwa].mp4",
    "https://www.fireload.com/91b71a410eced02a/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_05_[Hakoniwa].mp4",
    "https://www.fireload.com/7e1302f3e73108b0/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_06_[Hakoniwa].mp4",
    "https://www.fireload.com/ab9e70a695c0ca8e/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_07_[Hakoniwa].mp4",
    "https://www.fireload.com/6deb9a72e553f492/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_08_[Hakoniwa].mp4",
    "https://www.fireload.com/f7b47cedd2df7f16/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_09_[Hakoniwa].mp4",
    "https://www.fireload.com/87c5a474791814b6/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_10_[Hakoniwa].mp4",
    "https://www.fireload.com/886d727ac557f854/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_11_[Hakoniwa].mp4",
    "https://www.fireload.com/1baf59d9288e2073/[Az-Animex]_Kage_no_Jitsuryokusha_ni_Naritakute!_2nd_Season_-_12_[Hakoniwa].mp4"
];

const outputFolder = process.env.OUTPUT_FOLDER || path.resolve("F:\\Ani-Mag-Nov\\Kage no Jitsuryokusha ni Naritakute\\Temp 2");
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

const expectedFileNames = new Set(urls.map(url => url.split('/').pop()));


(async () => {
    const downloads = {};
    const listDownloads = [];
    const downloads_in__progress = {};

    if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);
    
    fs.watch(tempDir, (event, filename) => {
        if (filename && filename.endsWith('.crdownload')) {
            const now = new Date();
            console.log('⚠️ Descarga detectada en temporal:', filename);
    
            const downloadName = filename.replace(/\.crdownload$/, '');

            if (downloadName && typeof downloadName === 'string') {
                const exists = downloads_in__progress.hasOwnProperty(downloadName);
                if (!exists) {
                    downloads_in__progress["download"] = {
                        name: downloadName,
                        startTime: Date.now(),
                        visibility: true,
                        validated:false
                    }
                }
            } else {
                console.warn('🚫 El nombre extraído no es válido:', downloadName);
            }
        }
        
        // 🔄 Detectar archivos completados en Downloads y moverlos
        if (filename && !filename.endsWith('.crdownload') && expectedFileNames.has(filename)) {
            const sourcePath = path.join(tempDir, filename);
            const destPath = path.join(outputFolder, filename);
            
            // Esperar un poco para asegurar que el archivo esté completamente escrito
            setTimeout(() => {
                try {
                    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
                        fs.renameSync(sourcePath, destPath);
                        console.log(`📁 Movido desde Downloads (evento): ${filename} -> ${outputFolder}`);
                        
                        // Registrar en downloads
                        const { size, birthtimeMs } = fs.statSync(destPath);
                        downloads[filename] = {
                            filename,
                            unwanted: false,
                            state: 'completed',
                            size,
                            startTime: birthtimeMs,
                            lastUpdateTime: Date.now(),
                            ended: Date.now(),
                            source: 'moved_from_downloads_event'
                        };
                    }
                } catch (err) {
                    console.warn(`⚠️ No se pudo mover ${filename} (evento): ${err.message}`);
                }
            }, 1000); // Esperar 1 segundo para asegurar que el archivo esté completo
        }
    });
    
    
    // 📦 Watcher de sistema de archivos
    setInterval(() => {
        const files = fs.readdirSync(outputFolder);
        const now = Date.now();
    
        files.forEach(filename => {
            const fullPath = path.join(outputFolder, filename);
    
            // Verifica si ya está registrado
            if (downloads[filename]) return;
    
            try {
                const { size, birthtimeMs } = fs.statSync(fullPath);
    
    
                downloads[filename] = {
                    filename,
                    unwanted: !expectedFileNames.has(filename),
                    state: 'in_progress',
                    size,
                    progress: 0,
                    startTime: birthtimeMs,
                    lastUpdateTime: now,
                    ended: null,
                    source: 'readdir'
                };
    
                console.log(`📥 Archivo nuevo en tiempo válido: ${filename}`);
            } catch (err) {
                // Puede haber desaparecido entre readdir y stat
            }
        });

    }, 1000);
    

    // ⏱ Monitor de progreso en tiempo real
    setInterval(() => {
        // 🔍 Detección y eliminación de archivos no deseados
        try {
            const files = fs.readdirSync(outputFolder);
            files.forEach(filename => {
                const fullPath = path.join(outputFolder, filename);
                
                // Si es un archivo no deseado, eliminarlo inmediatamente
                if (!expectedFileNames.has(filename) && !filename.endsWith('.crdownload')) {
                    try {
                        console.log(`🗑️ Eliminando archivo no deseado: ${filename}`);
                        fs.unlinkSync(fullPath);
                    } catch (err) {
                        console.warn(`⚠️ No se pudo eliminar archivo no deseado ${filename}: ${err.message}`);
                    }
                }
            });
        } catch (err) {
            console.warn(`⚠️ Error al verificar archivos no deseados: ${err.message}`);
        }

        // 🔄 Verificar archivos en carpeta de descargas de Windows y moverlos
        try {
            const downloadFiles = fs.readdirSync(tempDir);
            downloadFiles.forEach(filename => {
                const sourcePath = path.join(tempDir, filename);
                const destPath = path.join(outputFolder, filename);
                
                // Solo mover archivos que están en nuestra lista esperada
                if (expectedFileNames.has(filename) && !filename.endsWith('.crdownload')) {
                    try {
                        // Verificar que el archivo no existe ya en destino
                        if (!fs.existsSync(destPath)) {
                            fs.renameSync(sourcePath, destPath);
                            console.log(`📁 Movido desde Downloads: ${filename} -> ${outputFolder}`);
                            
                            // Registrar en downloads si no existe
                            if (!downloads[filename]) {
                                const { size, birthtimeMs } = fs.statSync(destPath);
                                downloads[filename] = {
                                    filename,
                                    unwanted: false,
                                    state: 'completed',
                                    size,
                                    startTime: birthtimeMs,
                                    lastUpdateTime: Date.now(),
                                    ended: Date.now(),
                                    source: 'moved_from_downloads'
                                };
                            }
                        }
                    } catch (err) {
                        console.warn(`⚠️ No se pudo mover ${filename}: ${err.message}`);
                    }
                }
            });
        } catch (err) {
            console.warn(`⚠️ Error al verificar carpeta Downloads: ${err.message}`);
        }

        // 📊 Monitoreo de archivos en progreso
        for (const [filename, data] of Object.entries(downloads)) {
            const fullPath = path.join(outputFolder, filename);
            if (!fs.existsSync(fullPath)) continue;

            const { size } = fs.statSync(fullPath);
            const now = Date.now();
            const duration = ((now - data.startTime) / 1000).toFixed(1);

            data.lastUpdateTime = now;
            data.size = size;

        }
        if("download" in downloads_in__progress && downloads_in__progress["download"]["visibility"]){
            console.log("Nueva Descarga en progreso", downloads_in__progress["download"])
            downloads_in__progress["download"]['visibility'] = false;
        }
    }, 1000);

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-features=DownloadBubble`,
            `--download.default_directory="${outputFolder}"`,
            `--download.prompt_for_download=false`,
            `--download.directory_upgrade=true`
        ],
        executablePath: process.env.CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // o el path a Chromium
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (...) Safari/537.36');

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: outputFolder,
    });

    browser.on('targetcreated', async target => {
        try {
            const newPage = await target.page();
            if (!newPage) return;

            const newClient = await target.createCDPSession();
            await newClient.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: outputFolder
            });
        } catch (err) {
            console.warn(`⚠️ No se pudo configurar descarga en nuevo target: ${err.message}`);
        }
    });

    for (const url of urls) {
        try {
            console.log(`\nProcesando: ${url}`);
            const expectedFileName = url.split('/').pop();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // 1. Cerrar popups que se abren al cargar la página
            console.log("Revisando popups iniciales...");
            await new Promise(res => setTimeout(res, 3000));
            const allPages = await browser.pages();
            if (allPages.length > 1) {
                for (const p of allPages) {
                    if (p !== page && !p.isClosed()) {
                        try {
                            await p.close();
                            console.log("Popup inicial cerrado.");
                        } catch (e) { /* La página pudo haberse cerrado ya */ }
                    }
                }
            }
            
            await page.waitForSelector('#downloadButton', { visible: true, timeout: 20000 });
            const downloadLink = await page.$eval('#downloadButton', el => el.getAttribute('href'));

            // 2. Bucle de clicks para manejar popups e iniciar la descarga
            while (true) {
                const initialPagesCount = (await browser.pages()).length;
                await page.click('#downloadButton');
                await new Promise(res => setTimeout(res, 3000));
                const currentPages = await browser.pages();
                if (currentPages.length > initialPagesCount) {
                    console.log("Popup detectado. Cerrando y reintentando...");
                    for (let i = 1; i < currentPages.length; i++) {
                        if(!currentPages[i].isClosed()) await currentPages[i].close();
                    }
                    continue;
                } else {
                    console.log("Click exitoso. La descarga debería iniciarse.");
                    let startTime = Date.now();
                    break;
                }
            }
            if(
                !(
                "download" in downloads_in__progress &&
                downloads_in__progress.download.startTime &&
                downloads_in__progress.download.validated === false &&
                Math.abs(Date.now() - downloads_in__progress.download.startTime) <= 3000
                )
            ){
                // 3. ACTIVAR CON NAVEGACIÓN FORZADA: Si el click no fue suficiente.
                console.log("Forzando la descarga con navegación directa...");
                try {
                    await page.goto(downloadLink, { waitUntil: 'networkidle0', timeout: 10000 });
                    await new Promise(res => setTimeout(res, 5000));
                    // 2. ACTIVAR CON CLICKS: Bucle para hacer click hasta que no se abran popups Y el botón reaccione.
                    while (true) {
                        const initialPagesCount = (await browser.pages()).length;
                        await page.click('#downloadButton');
                        await new Promise(res => setTimeout(res, 3000)); // Espera para que se abran los popups
                        
                        const currentPages = await browser.pages();
                        if (currentPages.length > initialPagesCount) {
                            console.log("Popup detectado. Cerrando y reintentando...");
                            for (let i = 1; i < currentPages.length; i++) {
                                if(!currentPages[i].isClosed()) await currentPages[i].close();
                            }
                            continue; // Reintentar el click
                        }

                        // Si no hay popups, esperar a que el texto del botón cambie
                        console.log("No se detectaron popups. Esperando que el botón reaccione...");
                        try {
                            await page.waitForFunction(
                                () => !document.querySelector('#downloadButton .download-text')?.textContent.includes('Download File'),
                                { timeout: 5000 }
                            );
                            console.log("El botón reaccionó. La descarga debería iniciarse.");
                            break; // Salir del bucle, el click fue exitoso
                        } catch (e) {
                            console.log("El botón no reaccionó en 5 segundos. Reintentando click...");
                        }
                    }
                } catch (e) {
                    // Se espera un error 'net::ERR_ABORTED' si la descarga interrumpe la navegación.
                    console.log("Navegación interrumpida por descarga (comportamiento esperado).");
                }
            }
            listDownloads.push({
                name: expectedFileName,
                state: "in_progress",
                startTime: downloads_in__progress.startTime
            });
            downloads_in__progress.download.validated = true;
            console.log(` -> Descarga de ${expectedFileName} confirmada.`);
            
        } catch (error) {
            console.error(`Error procesando ${url}: ${error.message}`);
        }
    }

    // 5. Monitoreo final
    console.log("\nTodas las descargas iniciadas. Monitoreando progreso...");
    await new Promise(resolve => {
        const monitorInterval = setInterval(() => {
            const files = fs.readdirSync(outputFolder);
            const now = Date.now();
            let allExpectedCompleted = true;
            let totalSize = 0;
            let completedSize = 0;

            // Verificar archivos en la carpeta de destino
            files.forEach(filename => {
                const fullPath = path.join(outputFolder, filename);
                
                try {
                    const { size, birthtimeMs } = fs.statSync(fullPath);
                    
                    // Verificar si el archivo está completo (no es .crdownload)
                    if (!filename.endsWith('.crdownload')) {
                        // Actualizar o crear entrada en downloads
                        if (!downloads[filename]) {
                            downloads[filename] = {
                                filename,
                                unwanted: false,
                                state: 'completed',
                                size,
                                startTime: birthtimeMs,
                                lastUpdateTime: now,
                                ended: now,
                                source: 'final_check'
                            };
                            console.log(`✅ Archivo completado: ${filename} (${Math.round(size / 1024)} KB)`);
                        } else if (downloads[filename].state === 'in_progress') {
                            downloads[filename].state = 'completed';
                            downloads[filename].ended = now;
                            downloads[filename].size = size;
                            console.log(`✅ Archivo completado: ${filename} (${Math.round(size / 1024)} KB)`);
                        }
                        
                        totalSize += size;
                        completedSize += size;
                    } else {
                        // Archivo en progreso (.crdownload)
                        if (!downloads[filename.replace('.crdownload', '')]) {
                            downloads[filename.replace('.crdownload', '')] = {
                                filename: filename.replace('.crdownload', ''),
                                unwanted: false,
                                state: 'in_progress',
                                size,
                                startTime: birthtimeMs,
                                lastUpdateTime: now,
                                ended: null,
                                source: 'crdownload'
                            };
                        }
                        allExpectedCompleted = false;
                    }
                } catch (err) {
                    // El archivo pudo haber sido eliminado entre readdir y stat
                }
            });

            // Verificar que todos los archivos esperados estén completados
            for (const expectedFile of expectedFileNames) {
                const downloadEntry = downloads[expectedFile];
                if (!downloadEntry || downloadEntry.state !== 'completed') {
                    allExpectedCompleted = false;
                    break;
                }
            }

            // Mostrar progreso
            if (totalSize > 0) {
                const percent = ((completedSize / totalSize) * 100).toFixed(2);
                const completedCount = Object.values(downloads).filter(d => d.state === 'completed' && !d.unwanted).length;
                const totalExpected = expectedFileNames.size;
                process.stdout.write(`Progreso: ${completedCount}/${totalExpected} archivos completados (${percent}%) - ${(completedSize/1048576).toFixed(2)} MB \r`);
            }

            // Si todos los archivos esperados están completados, terminar
            if (allExpectedCompleted && expectedFileNames.size > 0) {
                clearInterval(monitorInterval);
                process.stdout.write("\n");
                console.log("🎉 ¡Todas las descargas han finalizado exitosamente!");
                console.log(`📁 Archivos descargados en: ${outputFolder}`);
                
                // Mostrar resumen final
                console.log("\n📊 Resumen de descargas:");
                Object.values(downloads).forEach(dl => {
                    if (!dl.unwanted && dl.state === 'completed') {
                        const duration = ((dl.ended - dl.startTime) / 1000).toFixed(1);
                        console.log(`  ✅ ${dl.filename} - ${Math.round(dl.size / 1024)} KB (${duration}s)`);
                    }
                });
                
                resolve();
            }
        }, 2000);
    });
    
    await browser.close();
})();