
        // Data Structure (in-memory storage)
        let files = [];
        let folders = [];
        let currentView = 'grid';
        let currentSection = 'all';
        let currentRenameId = null;
        const STORAGE_CAPACITY_GB = 15;
        const STORAGE_CAPACITY_BYTES = STORAGE_CAPACITY_GB * 1024 * 1024 * 1024;

        // File type configuration
        const fileTypeConfig = {
            image: { extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'], icon: '🖼️' },
            document: { extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'], icon: '📄' },
            spreadsheet: { extensions: ['xls', 'xlsx', 'csv'], icon: '📊' },
            presentation: { extensions: ['ppt', 'pptx'], icon: '📽️' },
            video: { extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'], icon: '🎬' },
            audio: { extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'], icon: '🎵' },
            archive: { extensions: ['zip', 'rar', '7z', 'tar', 'gz'], icon: '📦' },
            code: { extensions: ['html', 'css', 'js', 'json', 'xml', 'py', 'java', 'cpp'], icon: '💻' },
            folder: { extensions: [], icon: '📁' },
            other: { extensions: [], icon: '📎' }
        };

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            renderFiles();
        });

        function setupEventListeners() {
            // Upload button
            document.getElementById('uploadBtn').addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });

            // File input change
            document.getElementById('fileInput').addEventListener('change', handleFileSelect);

            // View toggle
            document.getElementById('gridViewBtn').addEventListener('click', () => setView('grid'));
            document.getElementById('listViewBtn').addEventListener('click', () => setView('list'));

            // Search
            document.getElementById('searchInput').addEventListener('input', handleSearch);

            // Sort
            document.getElementById('sortSelect').addEventListener('change', handleSort);

            // Navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const section = item.getAttribute('data-section');
                    switchSection(section);
                });
            });

            // Create folder
            document.getElementById('createFolderBtn').addEventListener('click', openFolderModal);

            // Drag and drop
            const dropZone = document.getElementById('dropZone');
            const content = document.querySelector('.content');

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                content.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                content.addEventListener(eventName, () => {
                    content.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                content.addEventListener(eventName, () => {
                    content.classList.remove('drag-over');
                }, false);
            });

            content.addEventListener('drop', handleDrop, false);
        }

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const droppedFiles = dt.files;
            handleFiles(droppedFiles);
        }

        function handleFileSelect(e) {
            const selectedFiles = e.target.files;
            handleFiles(selectedFiles);
            e.target.value = ''; // Reset input
        }

        function handleFiles(fileList) {
            Array.from(fileList).forEach(file => {
                const reader = new FileReader();
                const fileId = Date.now() + Math.random();
                const fileType = getFileType(file.name);
                const isImage = fileType === 'image';

                const fileData = {
                    id: fileId,
                    name: file.name,
                    size: file.size,
                    type: fileType,
                    uploadDate: new Date(),
                    isDeleted: false,
                    isFolder: false,
                    dataUrl: null
                };

                if (isImage && file.size < 5 * 1024 * 1024) { // Only store images under 5MB
                    reader.onload = (e) => {
                        fileData.dataUrl = e.target.result;
                        files.push(fileData);
                        renderFiles();
                        updateStorage();
                    };
                    reader.readAsDataURL(file);
                } else {
                    files.push(fileData);
                    renderFiles();
                    updateStorage();
                }
            });
        }

        function getFileType(fileName) {
            const extension = fileName.split('.').pop().toLowerCase();
            for (const [type, config] of Object.entries(fileTypeConfig)) {
                if (config.extensions.includes(extension)) {
                    return type;
                }
            }
            return 'other';
        }

        function getFileIcon(fileType) {
            return fileTypeConfig[fileType]?.icon || '📎';
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        }

        function formatDate(date) {
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Just now';
            if (minutes < 60) return minutes + ' min ago';
            if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
            if (days < 7) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
            return date.toLocaleDateString();
        }

        function setView(view) {
            currentView = view;
            document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
            document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
            renderFiles();
        }

        function switchSection(section) {
            currentSection = section;
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-section') === section);
            });

            const titles = {
                all: 'All Files',
                recent: 'Recent Files',
                trash: 'Trash'
            };
            document.getElementById('contentTitle').textContent = titles[section];
            renderFiles();
        }

        function getFilteredFiles() {
            let filtered = [...files];

            // Filter by section
            if (currentSection === 'trash') {
                filtered = filtered.filter(f => f.isDeleted);
            } else if (currentSection === 'recent') {
                filtered = filtered.filter(f => !f.isDeleted);
                const now = new Date();
                filtered = filtered.filter(f => (now - f.uploadDate) < 7 * 24 * 60 * 60 * 1000);
            } else {
                filtered = filtered.filter(f => !f.isDeleted);
            }

            // Filter by search
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            if (searchTerm) {
                filtered = filtered.filter(f => f.name.toLowerCase().includes(searchTerm));
            }

            return filtered;
        }

        function handleSearch() {
            renderFiles();
        }

        function handleSort() {
            renderFiles();
        }

        function sortFiles(fileArray) {
            const sortBy = document.getElementById('sortSelect').value;
            return fileArray.sort((a, b) => {
                if (sortBy === 'name') {
                    return a.name.localeCompare(b.name);
                } else if (sortBy === 'date') {
                    return b.uploadDate - a.uploadDate;
                } else if (sortBy === 'size') {
                    return b.size - a.size;
                }
                return 0;
            });
        }

        function renderFiles() {
            const filtered = getFilteredFiles();
            const sorted = sortFiles(filtered);

            const emptyState = document.getElementById('emptyState');
            const filesGrid = document.getElementById('filesGrid');
            const filesList = document.getElementById('filesList');

            if (sorted.length === 0) {
                emptyState.style.display = 'flex';
                filesGrid.style.display = 'none';
                filesList.style.display = 'none';
                return;
            }

            emptyState.style.display = 'none';

            if (currentView === 'grid') {
                filesGrid.style.display = 'grid';
                filesList.style.display = 'none';
                renderGridView(sorted);
            } else {
                filesGrid.style.display = 'none';
                filesList.style.display = 'flex';
                renderListView(sorted);
            }
        }

        function renderGridView(fileArray) {
            const container = document.getElementById('filesGrid');
            container.innerHTML = fileArray.map(file => `
                <div class="file-card">
                    ${file.dataUrl ? 
                        `<img src="${file.dataUrl}" alt="${file.name}" class="file-thumbnail">` :
                        `<div class="file-icon">${getFileIcon(file.type)}</div>`
                    }
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">${formatFileSize(file.size)} • ${formatDate(file.uploadDate)}</div>
                    <div class="file-actions">
                        ${currentSection !== 'trash' ? `
                            <button class="file-action-btn" onclick="downloadFile(${file.id})" title="Download">⬇️</button>
                            <button class="file-action-btn" onclick="openRenameModal(${file.id})" title="Rename">✏️</button>
                            <button class="file-action-btn danger" onclick="deleteFile(${file.id})" title="Delete">🗑️</button>
                        ` : `
                            <button class="file-action-btn" onclick="restoreFile(${file.id})" title="Restore">♻️</button>
                            <button class="file-action-btn danger" onclick="permanentDeleteFile(${file.id})" title="Delete Forever">❌</button>
                        `}
                    </div>
                </div>
            `).join('');
        }

        function renderListView(fileArray) {
            const container = document.getElementById('filesList');
            container.innerHTML = fileArray.map(file => `
                <div class="file-row">
                    ${file.dataUrl ? 
                        `<img src="${file.dataUrl}" alt="${file.name}" class="file-row-thumbnail">` :
                        `<div class="file-row-icon">${getFileIcon(file.type)}</div>`
                    }
                    <div class="file-row-info">
                        <div class="file-row-name">${file.name}</div>
                        <div class="file-row-meta">${formatFileSize(file.size)} • ${formatDate(file.uploadDate)}</div>
                    </div>
                    <div class="file-row-actions">
                        ${currentSection !== 'trash' ? `
                            <button class="file-action-btn" onclick="downloadFile(${file.id})" title="Download">⬇️ Download</button>
                            <button class="file-action-btn" onclick="openRenameModal(${file.id})" title="Rename">✏️ Rename</button>
                            <button class="file-action-btn danger" onclick="deleteFile(${file.id})" title="Delete">🗑️ Delete</button>
                        ` : `
                            <button class="file-action-btn" onclick="restoreFile(${file.id})" title="Restore">♻️ Restore</button>
                            <button class="file-action-btn danger" onclick="permanentDeleteFile(${file.id})" title="Delete Forever">❌ Delete</button>
                        `}
                    </div>
                </div>
            `).join('');
        }

        function downloadFile(fileId) {
            const file = files.find(f => f.id === fileId);
            if (!file) return;

            if (file.dataUrl) {
                const a = document.createElement('a');
                a.href = file.dataUrl;
                a.download = file.name;
                a.click();
            } else {
                alert('File download simulated. In a real application, this would download: ' + file.name);
            }
        }

        function deleteFile(fileId) {
            const file = files.find(f => f.id === fileId);
            if (file) {
                file.isDeleted = true;
                renderFiles();
                updateStorage();
            }
        }

        function restoreFile(fileId) {
            const file = files.find(f => f.id === fileId);
            if (file) {
                file.isDeleted = false;
                renderFiles();
            }
        }

        function permanentDeleteFile(fileId) {
            if (confirm('Are you sure you want to permanently delete this file?')) {
                files = files.filter(f => f.id !== fileId);
                renderFiles();
                updateStorage();
            }
        }

        function openRenameModal(fileId) {
            currentRenameId = fileId;
            const file = files.find(f => f.id === fileId);
            if (file) {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
                document.getElementById('renameInput').value = nameWithoutExt;
                document.getElementById('renameModal').classList.add('active');
                document.getElementById('renameInput').focus();
            }
        }

        function closeRenameModal() {
            document.getElementById('renameModal').classList.remove('active');
            currentRenameId = null;
        }

        function confirmRename() {
            const newName = document.getElementById('renameInput').value.trim();
            if (!newName) return;

            const file = files.find(f => f.id === currentRenameId);
            if (file) {
                const extension = file.name.substring(file.name.lastIndexOf('.'));
                file.name = newName + extension;
                renderFiles();
            }
            closeRenameModal();
        }

        function openFolderModal() {
            document.getElementById('folderModal').classList.add('active');
            document.getElementById('folderInput').focus();
        }

        function closeFolderModal() {
            document.getElementById('folderModal').classList.remove('active');
            document.getElementById('folderInput').value = '';
        }

        function confirmCreateFolder() {
            const folderName = document.getElementById('folderInput').value.trim();
            if (!folderName) return;

            const folderId = Date.now() + Math.random();
            const folderData = {
                id: folderId,
                name: folderName,
                size: 0,
                type: 'folder',
                uploadDate: new Date(),
                isDeleted: false,
                isFolder: true,
                dataUrl: null
            };

            files.push(folderData);
            renderFiles();
            closeFolderModal();
        }

        function updateStorage() {
            const activeFiles = files.filter(f => !f.isDeleted);
            const totalUsed = activeFiles.reduce((sum, file) => sum + file.size, 0);
            const usedGB = totalUsed / (1024 * 1024 * 1024);
            const percentage = (totalUsed / STORAGE_CAPACITY_BYTES) * 100;

            document.getElementById('storageFill').style.width = Math.min(percentage, 100) + '%';
            document.getElementById('storageText').textContent = 
                `${usedGB.toFixed(2)} GB of ${STORAGE_CAPACITY_GB} GB used`;
        }

        // Modal keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeRenameModal();
                closeFolderModal();
            }
            if (e.key === 'Enter') {
                if (document.getElementById('renameModal').classList.contains('active')) {
                    confirmRename();
                }
                if (document.getElementById('folderModal').classList.contains('active')) {
                    confirmCreateFolder();
                }
            }
        });
   