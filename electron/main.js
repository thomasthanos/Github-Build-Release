const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, execFile } = require('child_process');


const baseEnv = { ...process.env };

const isDev = process.env.NODE_ENV === 'development';

// Override userData path: AppData/Roaming/ThomasThanos/GithubReleaseManager
const customUserData = path.join(app.getPath('appData'), 'ThomasThanos', 'GithubReleaseManager');
app.setPath('userData', customUserData);

let mainWindow;

// Config path για αποθήκευση API key
let configPath;
app.whenReady().then(() => {
    configPath = path.join(app.getPath('userData'), 'grm-config.json');
});

function readConfig() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    } catch {}
    return {};
}

function writeConfig(data) {
    try {
        const current = readConfig();
        fs.writeFileSync(configPath, JSON.stringify({ ...current, ...data }, null, 2));
        return true;
    } catch { return false; }
}

function getBuildCommand(projectPath, overrideCommand) {
    if (overrideCommand && overrideCommand.trim()) return overrideCommand.trim();

    const pkgPath = path.join(projectPath, 'package.json');
    let buildCommand = null;

    try {
        const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgRaw);
        const scripts = pkg.scripts || {};

        // Priority: build-all > release > build
        if (scripts['build-all']) {
            buildCommand = 'npm run build-all';
        } else if (scripts['release']) {
            buildCommand = 'npm run release';
        } else if (scripts.build) {
            buildCommand = 'npm run build';
        }
    } catch {
        buildCommand = null;
    }

    return buildCommand;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 850,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#0f172a',
        frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#ffffff',
            height: 36
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: !isDev
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

app.whenReady().then(createWindow);

// --- WINDOW CONTROL HANDLERS ---

ipcMain.on('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.on('window-toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

// --- TITLEBAR THEME HANDLER ---
ipcMain.handle('set-titlebar-theme', (event, theme) => {
    if (!mainWindow) return;
    try {
        mainWindow.setTitleBarOverlay({
            color: '#00000000',
            symbolColor: theme === 'dark' ? '#ffffff' : '#1a1d21',
            height: 36
        });
    } catch (err) {
        console.error('Failed to set titlebar theme:', err);
    }
});

// --- PROJECT HANDLERS ---

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

// CHECK GITHUB CLI STATUS
ipcMain.handle('check-gh-status', async () => {
    return new Promise((resolve) => {
        // Check if gh is installed
        exec('gh --version', { env: baseEnv }, (versionError) => {
            if (versionError) {
                resolve({ installed: false, loggedIn: false });
                return;
            }

            // Check if logged in
            exec('gh auth status', { env: baseEnv }, (authError, stdout, stderr) => {
                const output = stdout + stderr;
                const loggedIn = !authError && output.includes('Logged in');
                resolve({ installed: true, loggedIn });
            });
        });
    });
});

// PROJECT INFO
ipcMain.handle('get-project-info', async (event, projectPath) => {
    const pkgPath = path.join(projectPath, 'package.json');
    let version = null;
    let suggestedBuildCommand = null;

    try {
        const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgRaw);
        version = pkg.version || null;
        suggestedBuildCommand = getBuildCommand(projectPath, null);
    } catch {
        version = null;
        suggestedBuildCommand = null;
    }

    return { version, suggestedBuildCommand };
});

// GET RELEASES
// GET RELEASES & TAGS
ipcMain.handle('get-releases', async (event, projectPath) => {
    return new Promise((resolve) => {
        const getRepoCmd = 'gh repo view --json url';
        exec(getRepoCmd, { cwd: projectPath, env: baseEnv }, (error, stdout) => {
            if (error) {
                // Αν αποτύχει το gh repo view, δοκιμάζουμε με git remote
                exec('git remote get-url origin', { cwd: projectPath }, (gitError, gitStdout) => {
                    if (gitError) {
                        resolve([]);
                        return;
                    }
                    const repoUrl = gitStdout.trim().replace('.git', '');
                    fetchReleasesAndTags(projectPath, repoUrl, resolve);
                });
                return;
            }

            try {
                const repoInfo = JSON.parse(stdout);
                const repoUrl = repoInfo.url;
                fetchReleasesAndTags(projectPath, repoUrl, resolve);
            } catch (e) {
                console.error('Error parsing repo info:', e);
                resolve([]);
            }
        });
    });
});

function fetchReleasesAndTags(projectPath, repoUrl, resolve) {
    // Πάρε releases
    const releasesCmd = 'gh release list --json tagName,publishedAt,name,isDraft --limit 50';
    exec(releasesCmd, { cwd: projectPath, env: baseEnv }, (releaseError, releaseStdout) => {
        let releases = [];
        let releaseTags = new Set();

        if (!releaseError) {
            try {
                const rawReleases = JSON.parse(releaseStdout);
                releases = rawReleases.map(rel => ({
                    tagName: rel.tagName,
                    publishedAt: rel.publishedAt,
                    url: `${repoUrl}/releases/tag/${rel.tagName}`,
                    title: rel.name || rel.tagName,
                    isDraft: rel.isDraft || false,
                    type: 'release'
                }));
                // Κρατάμε τα tags που έχουν release
                releases.forEach(rel => releaseTags.add(rel.tagName));
            } catch (e) {
                console.error('Error parsing releases:', e);
            }
        }

        // Πάρε όλα τα tags (git tags)
        const tagsCmd = 'git tag --list --sort=-creatordate';
        exec(tagsCmd, { cwd: projectPath }, (tagsError, tagsStdout) => {
            let tagsWithoutReleases = [];

            if (!tagsError && tagsStdout.trim()) {
                const allTags = tagsStdout.trim().split('\n');

                // Φίλτραρε μόνο τα tags που ΔΕΝ έχουν release
                tagsWithoutReleases = allTags
                    .filter(tag => tag && !releaseTags.has(tag))
                    .slice(0, 20) // Περιορισμός για απόδοση
                    .map(tag => ({
                        tagName: tag,
                        publishedAt: null,
                        url: `${repoUrl}/releases/tag/${tag}`,
                        title: tag,
                        isDraft: false,
                        type: 'tag-only' // Διαφορετικός τύπος
                    }));
            }

            // Ενώνουμε releases και tags χωρίς releases
            const allItems = [...releases, ...tagsWithoutReleases]
                .sort((a, b) => {
                    // Ταξινόμηση βάσει ημερομηνίας (αν υπάρχει) ή αλφαβητικά
                    if (a.publishedAt && b.publishedAt) {
                        return new Date(b.publishedAt) - new Date(a.publishedAt);
                    }
                    if (a.publishedAt) return -1;
                    if (b.publishedAt) return 1;
                    return b.tagName.localeCompare(a.tagName);
                });

            resolve(allItems);
        });
    });
}

// CREATE RELEASE WITH BUILD & UPLOAD
ipcMain.handle('create-release', async (event, { path: projectPath, version, title, notes, buildCommand }) => {
    return new Promise((resolve) => {

        // Step 1: Resolve build command
        const resolvedBuildCommand = getBuildCommand(projectPath, buildCommand);
        if (!resolvedBuildCommand) {
            resolve({ success: false, error: 'No build script found in package.json and no custom command provided.' });
            return;
        }

        mainWindow.webContents.send('build-log', `\n🔨 Step 1/3: Building project...\n`);

        // Get GH_TOKEN from gh CLI so electron-builder can auto-publish
        exec('gh auth token', { env: baseEnv }, (tokenErr, tokenStdout) => {
            const ghToken = tokenErr ? null : tokenStdout.trim();
            const buildEnv = ghToken ? { ...baseEnv, GH_TOKEN: ghToken } : baseEnv;

            if (ghToken) {
                mainWindow.webContents.send('build-log', `\n🔑 GH_TOKEN injected from gh CLI\n`);
            } else {
                mainWindow.webContents.send('build-log', `\n⚠️ Could not get GH_TOKEN — publish may fail\n`);
            }

            const buildProcess = exec(resolvedBuildCommand, { cwd: projectPath, env: buildEnv });
            buildProcess.stdout.on('data', (data) => mainWindow.webContents.send('build-log', data));
            buildProcess.stderr.on('data', (data) => mainWindow.webContents.send('build-log', `[BUILD] ${data}`));

            buildProcess.on('close', (buildCode) => {
                if (buildCode !== 0) {
                    mainWindow.webContents.send('build-log', `\n❌ Build failed with code ${buildCode}\n`);
                    resolve({ success: false, error: `Build failed with exit code ${buildCode}` });
                    return;
                }

                mainWindow.webContents.send('build-log', `\n✅ Build completed successfully!\n`);

                // Step 2: Create GitHub release
                mainWindow.webContents.send('build-log', `\n🚀 Step 2/3: Creating GitHub release ${version}...\n`);

                const notesFilePath = path.join(os.tmpdir(), `release-notes-${Date.now()}.md`);
                try {
                    fs.writeFileSync(notesFilePath, notes, 'utf-8');
                } catch (writeErr) {
                    resolve({ success: false, error: `Failed to write release notes: ${writeErr.message}` });
                    return;
                }

                const ghArgs = ['release', 'create', version, '--title', title, '--notes-file', notesFilePath];
                execFile('gh', ghArgs, { cwd: projectPath, env: buildEnv }, (error, stdout, stderr) => {
                    fs.unlink(notesFilePath, () => {});

                    if (error) {
                        mainWindow.webContents.send('build-log', `\n❌ Failed to create release: ${stderr}\n`);
                        resolve({ success: false, error: stderr });
                        return;
                    }

                    mainWindow.webContents.send('build-log', `\n✅ Release created successfully!\n`);

                    // Step 3: Upload artifacts
                    mainWindow.webContents.send('build-log', `\n📦 Step 3/3: Uploading build artifacts...\n`);

                    const distPath = path.join(projectPath, 'dist');
                    const releasePath = path.join(projectPath, 'release');
                    const artifactPath = fs.existsSync(releasePath) ? releasePath
                        : fs.existsSync(distPath) ? distPath
                        : null;

                    if (!artifactPath) {
                        mainWindow.webContents.send('build-log', `\n⚠️ No dist or release folder found. Skipping artifact upload.\n`);
                        resolve({ success: true, output: stdout });
                        return;
                    }

                    mainWindow.webContents.send('build-log', `\n📁 Artifacts folder: ${path.basename(artifactPath)}\n`);

                    const files = fs.readdirSync(artifactPath);
                    const artifactFiles = files.filter(f => {
                        const lower = f.toLowerCase();
                        if (lower === 'builder-debug.yml') return false;
                        return (
                            lower.endsWith('.exe') ||
                            lower.endsWith('.yml') ||
                            lower.endsWith('.blockmap') ||
                            lower.endsWith('.dmg') ||
                            lower.endsWith('.appimage')
                        );
                    });

                    if (artifactFiles.length === 0) {
                        mainWindow.webContents.send('build-log', `\n⚠️ No artifacts found to upload.\n`);
                        resolve({ success: true, output: stdout });
                        return;
                    }

                    mainWindow.webContents.send('build-log', `\nFound ${artifactFiles.length} files to upload:\n${artifactFiles.map(f => `  - ${f}`).join('\n')}\n`);

                    const uploadPromises = artifactFiles.map((file) => {
                        return new Promise((uploadResolve) => {
                            const filePath = path.join(artifactPath, file);
                            execFile('gh', ['release', 'upload', version, filePath], { cwd: projectPath, env: buildEnv }, (err, _stdout, stderr) => {
                                if (err) {
                                    mainWindow.webContents.send('build-log', `\n❌ Failed to upload ${file}\n`);
                                    uploadResolve({ success: false, file, error: stderr });
                                } else {
                                    mainWindow.webContents.send('build-log', `\n✅ Uploaded ${file}\n`);
                                    uploadResolve({ success: true, file });
                                }
                            });
                        });
                    });

                    Promise.allSettled(uploadPromises).then((results) => {
                        const uploadErrors = results
                            .filter(r => r.status === 'fulfilled' && !r.value.success)
                            .map(r => `${r.value.file}: ${r.value.error}`);

                        if (uploadErrors.length > 0) {
                            mainWindow.webContents.send('build-log', `\n⚠️ Some uploads failed:\n${uploadErrors.join('\n')}\n`);
                        } else {
                            mainWindow.webContents.send('build-log', `\n🎉 All artifacts uploaded successfully!\n`);
                        }

                        resolve({
                            success: uploadErrors.length === 0,
                            output: stdout,
                            partialSuccess: uploadErrors.length < artifactFiles.length
                        });
                    });
                });
            });
        });
    });
});

// DELETE RELEASE + TAGS (remote & local)
// DELETE RELEASE + TAGS - Robust έκδοση
ipcMain.handle('delete-release', async (event, { path: projectPath, tagName }) => {
    const execWithLog = (cmd) => {
        return new Promise((resolve) => {
            exec(cmd, { cwd: projectPath, env: baseEnv }, (error, stdout, stderr) => {
                if (error) {
                    resolve({ success: false, error: stderr || error.message });
                } else {
                    resolve({ success: true, output: stdout });
                }
            });
        });
    };

    try {
        // STRATEGY 1: Προσπάθεια με GitHub CLI (για releases)
        await execWithLog(
            `gh release delete "${tagName}" --yes`
        );

        // STRATEGY 2: Προσπάθεια με Git (για tags)
        // 2a. Διαγραφή remote tag
        const remoteResult = await execWithLog(
            `git push origin --delete "${tagName}"`
        );

        // 2b. Εναλλακτική μέθοδος διαγραφής remote tag
        if (!remoteResult.success) {
            await execWithLog(
                `git push origin :refs/tags/${tagName}`
            );
        }

        // 2c. Διαγραφή local tag
        const localResult = await execWithLog(
            `git tag -d "${tagName}"`
        );

        // STRATEGY 3: Force delete αν τα παραπάνω αποτύχουν
        if (!localResult.success) {
            await execWithLog(
                `git tag -d "${tagName}" 2>/dev/null || true`
            );
        }

        // STRATEGY 4: Cleanup και sync
        await execWithLog('git fetch --prune --tags');
        await execWithLog('git fetch --prune origin');
        await execWithLog('git tag | grep -v "${tagName}" | xargs git tag -d 2>/dev/null || true');

        // ΕΛΕΓΧΟΣ: Επαλήθευση ότι το tag έχει διαγραφεί
        const verifyLocal = await execWithLog(`git tag -l "${tagName}"`);
        const verifyRemote = await execWithLog(`git ls-remote --tags origin "${tagName}"`);

        if (verifyLocal.success && verifyLocal.output.includes(tagName)) {
            // Προσπάθεια force delete
            await execWithLog(`git tag -d "${tagName}"`);
        }

        // ΑΠΟΤΕΛΕΣΜΑΤΑ
        const hasLocalTag = verifyLocal.success && verifyLocal.output.includes(tagName);
        const hasRemoteTag = verifyRemote.success && verifyRemote.output.includes(tagName);

        if (!hasLocalTag && !hasRemoteTag) {
            return {
                success: true,
                message: `Successfully deleted ${tagName} from both local and remote repositories`
            };
        } else if (!hasLocalTag && hasRemoteTag) {
            return {
                success: true,
                message: `Deleted ${tagName} locally. Remote tag may still exist due to permissions.`,
                warning: 'Remote tag deletion may need manual intervention'
            };
        } else if (hasLocalTag && !hasRemoteTag) {
            return {
                success: true,
                message: `Deleted ${tagName} remotely. Local tag may be cached.`,
                warning: 'Run "git fetch --prune --tags" to sync local tags'
            };
        } else {
            return {
                success: false,
                error: `Could not delete ${tagName}. It may be protected or you lack permissions.`,
                suggestion: 'Try deleting manually: 1) Delete from GitHub website, 2) Run: git push origin --delete TAG_NAME, 3) Run: git tag -d TAG_NAME'
            };
        }

    } catch (err) {
        console.error(`❌ UNEXPECTED ERROR deleting ${tagName}:`, err);
        return {
            success: false,
            error: `Unexpected error: ${err.message}`,
            suggestion: 'Check your Git and GitHub CLI configuration'
        };
    }
});

// --- AI HANDLERS ---

ipcMain.handle('get-api-key', async () => {
    const config = readConfig();
    return config.deepseekApiKey || null;
});

ipcMain.handle('save-api-key', async (event, apiKey) => {
    const ok = writeConfig({ deepseekApiKey: apiKey });
    return { success: ok };
});

ipcMain.handle('format-with-ai', async (event, { text, apiKey }) => {
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `You are a GitHub release notes formatter. Format user input into clean, professional GitHub release notes using Markdown.
Rules:
- Use ## for main sections (e.g. ## ✨ What's New, ## 🐛 Bug Fixes, ## 🔧 Improvements)
- Use bullet points with - for each item
- Add relevant emojis to bullet points
- Keep it concise and clear
- Use GitHub-flavored markdown
- Return a JSON object with exactly two fields: "title" (a short, professional release title, max 6 words, no version number, no quotes) and "notes" (the formatted markdown)
- Return ONLY the raw JSON object, no markdown fences, no extra text`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error?.message || 'API error' };
        }

        const raw = data.choices[0].message.content.trim();
        let title = '';
        let notes = raw;
        try {
            const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(cleaned);
            title = parsed.title || '';
            notes = parsed.notes || raw;
        } catch {}
        return { success: true, result: notes, title };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// TRIGGER BUILD
ipcMain.handle('trigger-build', (event, { path: projectPath, command }) => {
    const resolvedBuildCommand = getBuildCommand(projectPath, command);

    if (!resolvedBuildCommand) {
        mainWindow.webContents.send('build-log', `\n❌ No build script found (looking for "build-all" or "build") and no custom command provided.\n`);
        mainWindow.webContents.send('build-complete');
        return;
    }

    mainWindow.webContents.send('build-log', `\n🚀 Starting ${resolvedBuildCommand} in: ${projectPath}...\n`);
    const buildProcess = exec(resolvedBuildCommand, { cwd: projectPath });
    buildProcess.stdout.on('data', (data) => mainWindow.webContents.send('build-log', data));
    buildProcess.stderr.on('data', (data) => mainWindow.webContents.send('build-log', `[MSG] ${data}`));
    buildProcess.on('close', async (code) => {
        let msg;

        if (code === 0) {
            msg = '\n✅ Build Completed Successfully!';

            const distPath = path.join(projectPath, 'dist');
            const releasePath = path.join(projectPath, 'release');
            let openedPath = null;

            if (fs.existsSync(distPath)) {
                openedPath = distPath;
            } else if (fs.existsSync(releasePath)) {
                openedPath = releasePath;
            }

            if (openedPath) {
                try {
                    const openResult = await shell.openPath(openedPath);
                    if (openResult) {
                        msg += `\n⚠️ Could not open output folder: ${openResult}`;
                    } else {
                        msg += `\n📂 Opened output folder: ${path.basename(openedPath)}`;
                    }
                } catch (err) {
                    msg += `\n⚠️ Could not open output folder: ${err.message}`;
                }
            }
        } else {
            msg = `\n❌ Build Failed (Code ${code})`;
        }

        mainWindow.webContents.send('build-log', msg);
        // Send build complete event
        mainWindow.webContents.send('build-complete');
    });
});