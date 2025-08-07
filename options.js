document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const llmProviderSelect = document.getElementById('llmProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const customEndpointGroup = document.getElementById('customEndpointGroup');
    const customEndpointInput = document.getElementById('customEndpoint');
    const modelNameInput = document.getElementById('modelName');
    const saveConfigBtn = document.getElementById('saveConfig');
    const testConnectionBtn = document.getElementById('testConnection');
    const configStatus = document.getElementById('configStatus');
    const apiKeyHelp = document.getElementById('apiKeyHelp');
    const historySearch = document.getElementById('historySearch');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const historyContainer = document.getElementById('historyContainer');
    const librarySearch = document.getElementById('librarySearch');
    const addPromptBtn = document.getElementById('addPrompt');
    const libraryContainer = document.getElementById('libraryContainer');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const copyUserIdBtn = document.getElementById('copyUserId');
    const subscriptionStatusDisplay = document.getElementById('subscriptionStatusDisplay');
    const syncBackendBtn = document.getElementById('syncBackend');
    
    // Modal elements
    const promptModal = document.getElementById('promptModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtn = document.getElementById('closeModal');
    const promptTitle = document.getElementById('promptTitle');
    const promptContent = document.getElementById('promptContent');
    const cancelPromptBtn = document.getElementById('cancelPrompt');
    const savePromptBtn = document.getElementById('savePrompt');

    let editingPromptIndex = -1;

    // Initialize
    loadLLMConfig();
    loadUserInfo();
    loadHistory();
    loadLibrary();

    // Event listeners
    llmProviderSelect.addEventListener('change', updateProviderUI);
    toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    saveConfigBtn.addEventListener('click', saveLLMConfig);
    testConnectionBtn.addEventListener('click', testLLMConnection);
    historySearch.addEventListener('input', filterHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    librarySearch.addEventListener('input', filterLibrary);
    addPromptBtn.addEventListener('click', () => openPromptModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelPromptBtn.addEventListener('click', closeModal);
    savePromptBtn.addEventListener('click', savePromptToLibrary);
    
    if (copyUserIdBtn) {
        copyUserIdBtn.addEventListener('click', copyUserId);
    }
    if (syncBackendBtn) {
        syncBackendBtn.addEventListener('click', syncWithBackend);
    }

    // Close modal when clicking outside
    promptModal.addEventListener('click', function(e) {
        if (e.target === promptModal) {
            closeModal();
        }
    });

    async function loadLLMConfig() {
        try {
            const result = await browser.storage.local.get(['llmProvider', 'apiKey', 'customEndpoint', 'modelName']);
            
            if (result.llmProvider) {
                llmProviderSelect.value = result.llmProvider;
            }
            if (result.apiKey) {
                apiKeyInput.value = result.apiKey;
            }
            if (result.customEndpoint) {
                customEndpointInput.value = result.customEndpoint;
            }
            if (result.modelName) {
                modelNameInput.value = result.modelName;
            }
            
            updateProviderUI();
            
            if (result.apiKey) {
                showConfigStatus('Configuration loaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error loading LLM config:', error);
        }
    }
    
    async function loadUserInfo() {
        try {
            const result = await browser.storage.local.get(['userId', 'subscriptionStatus']);
            const userId = result.userId;
            const subscriptionStatus = result.subscriptionStatus || 'freemium';
            
            if (userIdDisplay && userId) {
                userIdDisplay.textContent = userId;
            }
            
            if (subscriptionStatusDisplay) {
                const statusText = subscriptionStatus === 'premium' ? 'Premium' : 'Freemium';
                const statusColor = subscriptionStatus === 'premium' ? '#4CAF50' : '#2196F3';
                subscriptionStatusDisplay.textContent = statusText;
                subscriptionStatusDisplay.style.color = statusColor;
                subscriptionStatusDisplay.style.fontWeight = '600';
            }
            
            // Update UI based on subscription
            updateUIForSubscription(subscriptionStatus);
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }
    
    function updateUIForSubscription(subscriptionStatus) {
        // Update prompt library limit info
        const maxPrompts = subscriptionStatus === 'premium' ? 50 : 15;
        const libraryTitle = document.querySelector('.library-section h3');
        if (libraryTitle) {
            libraryTitle.textContent = `Saved Prompt Library (${maxPrompts} slots)`;
        }
        
        // Update history limit info
        const maxHistory = subscriptionStatus === 'premium' ? 100 : 30;
        const historyTitle = document.querySelector('.history-section h3');
        if (historyTitle) {
            historyTitle.textContent = `Optimization History (Last ${maxHistory} entries)`;
        }
    }
    
    async function copyUserId() {
        try {
            const result = await browser.storage.local.get('userId');
            if (result.userId) {
                await navigator.clipboard.writeText(result.userId);
                
                // Show feedback
                const originalText = copyUserIdBtn.textContent;
                copyUserIdBtn.textContent = 'Copied!';
                copyUserIdBtn.style.background = '#4CAF50';
                
                setTimeout(() => {
                    copyUserIdBtn.textContent = originalText;
                    copyUserIdBtn.style.background = '';
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to copy user ID:', error);
            copyUserIdBtn.textContent = 'Failed';
            setTimeout(() => {
                copyUserIdBtn.textContent = 'Copy';
            }, 2000);
        }
    }
    
    async function syncWithBackend() {
        if (!syncBackendBtn) return;
        
        const originalText = syncBackendBtn.textContent;
        syncBackendBtn.textContent = 'Syncing...';
        syncBackendBtn.disabled = true;
        
        try {
            const response = await browser.runtime.sendMessage({ action: 'syncBackend' });
            if (response.success) {
                await loadUserInfo();
                showConfigStatus('Subscription status updated successfully!', 'success');
            } else {
                showConfigStatus('Failed to sync with backend', 'error');
            }
        } catch (error) {
            console.error('Error syncing with backend:', error);
            showConfigStatus('Sync failed - using cached status', 'warning');
        } finally {
            syncBackendBtn.textContent = originalText;
            syncBackendBtn.disabled = false;
        }
    }

    function updateProviderUI() {
        const provider = llmProviderSelect.value;
        
        // Show/hide custom endpoint field
        customEndpointGroup.style.display = provider === 'custom' ? 'block' : 'none';
        
        // Update help text and model placeholder based on provider
        switch (provider) {
            case 'openai':
                apiKeyHelp.innerHTML = `
                    <p>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a></p>
                    <p>Your API key is stored locally and never shared with our servers.</p>
                `;
                modelNameInput.placeholder = 'gpt-4, gpt-3.5-turbo, gpt-4-turbo';
                modelNameInput.value = modelNameInput.value || 'gpt-4';
                break;
            case 'anthropic':
                apiKeyHelp.innerHTML = `
                    <p>Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a></p>
                    <p>Your API key is stored locally and never shared with our servers.</p>
                `;
                modelNameInput.placeholder = 'claude-3-sonnet-20240229, claude-3-haiku-20240307';
                modelNameInput.value = modelNameInput.value || 'claude-3-sonnet-20240229';
                break;
            case 'google':
                apiKeyHelp.innerHTML = `
                    <p>Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
                    <p>Your API key is stored locally and never shared with our servers.</p>
                `;
                modelNameInput.placeholder = 'gemini-pro, gemini-2.5-flash';
                modelNameInput.value = modelNameInput.value || 'gemini-2.5-flash';
                break;
            case 'custom':
                apiKeyHelp.innerHTML = `
                    <p>Enter your custom API endpoint and authentication details.</p>
                    <p>Your credentials are stored locally and never shared with our servers.</p>
                `;
                modelNameInput.placeholder = 'Enter model identifier';
                break;
        }
    }

    function toggleApiKeyVisibility() {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiKeyBtn.textContent = '🙈';
        } else {
            apiKeyInput.type = 'password';
            toggleApiKeyBtn.textContent = '👁️';
        }
    }

    async function saveLLMConfig() {
        const provider = llmProviderSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const customEndpoint = customEndpointInput.value.trim();
        const modelName = modelNameInput.value.trim();
        
        if (!apiKey) {
            showConfigStatus('Please enter an API key', 'error');
            return;
        }

        if (provider === 'custom' && !customEndpoint) {
            showConfigStatus('Please enter a custom endpoint URL', 'error');
            return;
        }

        if (!modelName) {
            showConfigStatus('Please enter a model name', 'error');
            return;
        }

        try {
            await browser.storage.local.set({
                llmProvider: provider,
                apiKey: apiKey,
                customEndpoint: customEndpoint,
                modelName: modelName
            });
            showConfigStatus('Configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving LLM config:', error);
            showConfigStatus('Error saving configuration', 'error');
        }
    }

    async function testLLMConnection() {
        const provider = llmProviderSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const customEndpoint = customEndpointInput.value.trim();
        const modelName = modelNameInput.value.trim();
        
        if (!apiKey) {
            showConfigStatus('Please enter an API key first', 'error');
            return;
        }

        testConnectionBtn.disabled = true;
        testConnectionBtn.textContent = 'Testing...';
        
        try {
            const response = await browser.runtime.sendMessage({
                action: 'testConnection',
                data: { provider, apiKey, customEndpoint, modelName }
            });
            
            if (response.success) {
                showConfigStatus('Connection test successful!', 'success');
            } else {
                showConfigStatus(response.error || 'Connection test failed', 'error');
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            showConfigStatus('Error testing connection', 'error');
        } finally {
            testConnectionBtn.disabled = false;
            testConnectionBtn.textContent = 'Test Connection';
        }
    }

    function showConfigStatus(message, type) {
        configStatus.textContent = message;
        configStatus.className = `status-message ${type}`;
        setTimeout(() => {
            configStatus.style.display = 'none';
        }, 3000);
    }

    async function loadHistory() {
        try {
            const result = await browser.storage.local.get('optimizationHistory');
            const history = result.optimizationHistory || [];
            renderHistory(history);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    function renderHistory(history) {
        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <p>No optimization history yet. Start optimizing prompts to see them here!</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="item-header">
                    <span class="item-timestamp">${new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div class="item-content">
                    <div class="original-prompt">
                        <div class="prompt-label">Original Prompt:</div>
                        <div class="prompt-text">${escapeHtml(item.originalPrompt)}</div>
                    </div>
                    <div class="optimized-prompt">
                        <div class="prompt-label">Optimized Prompt:</div>
                        <div class="prompt-text">${escapeHtml(item.optimizedPrompt)}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="use-btn" onclick="copyToClipboard('${escapeHtml(item.optimizedPrompt)}')">Copy</button>
                    <button class="edit-btn" onclick="saveToLibrary('${escapeHtml(item.optimizedPrompt)}')">Save to Library</button>
                </div>
            </div>
        `).join('');
    }

    function filterHistory() {
        const searchTerm = historySearch.value.toLowerCase();
        const historyItems = historyContainer.querySelectorAll('.history-item');
        
        historyItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    }

    async function clearHistory() {
        if (confirm('Are you sure you want to clear all optimization history?')) {
            try {
                await browser.storage.local.set({ optimizationHistory: [] });
                loadHistory();
            } catch (error) {
                console.error('Error clearing history:', error);
            }
        }
    }

    async function loadLibrary() {
        try {
            const result = await browser.storage.local.get('promptLibrary');
            const library = result.promptLibrary || [];
            renderLibrary(library);
        } catch (error) {
            console.error('Error loading library:', error);
        }
    }

    function renderLibrary(library) {
        if (library.length === 0) {
            libraryContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">💾</span>
                    <p>No saved prompts yet. Save your favorite optimized prompts for quick access!</p>
                </div>
            `;
            return;
        }

        libraryContainer.innerHTML = library.map((item, index) => `
            <div class="library-item" data-index="${index}">
                <div class="item-header">
                    <h4>${escapeHtml(item.title)}</h4>
                    <span class="item-timestamp">${new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div class="item-content">
                    <div class="prompt-text">${escapeHtml(item.content)}</div>
                </div>
                <div class="item-actions">
                    <button class="use-btn" onclick="copyToClipboard('${escapeHtml(item.content)}')">Copy</button>
                    <button class="edit-btn" onclick="editPrompt(${index})">Edit</button>
                    <button class="delete-btn" onclick="deletePrompt(${index})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function filterLibrary() {
        const searchTerm = librarySearch.value.toLowerCase();
        const libraryItems = libraryContainer.querySelectorAll('.library-item');
        
        libraryItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    }

    function openPromptModal(title = '', content = '', index = -1) {
        modalTitle.textContent = index >= 0 ? 'Edit Prompt' : 'Add New Prompt';
        promptTitle.value = title;
        promptContent.value = content;
        editingPromptIndex = index;
        promptModal.classList.add('show');
    }

    function closeModal() {
        promptModal.classList.remove('show');
        promptTitle.value = '';
        promptContent.value = '';
        editingPromptIndex = -1;
    }

    async function savePromptToLibrary() {
        const title = promptTitle.value.trim();
        const content = promptContent.value.trim();
        
        if (!title || !content) {
            alert('Please enter both title and content');
            return;
        }

        try {
            const result = await browser.storage.local.get('promptLibrary');
            const library = result.promptLibrary || [];
            
            if (editingPromptIndex >= 0) {
                // Edit existing prompt
                library[editingPromptIndex] = {
                    title,
                    content,
                    timestamp: library[editingPromptIndex].timestamp // Keep original timestamp
                };
            } else {
                // Add new prompt - check subscription limit
                const result = await browser.storage.local.get('subscriptionStatus');
                const subscriptionStatus = result.subscriptionStatus || 'freemium';
                const maxPrompts = subscriptionStatus === 'premium' ? 50 : 15;
                
                if (library.length >= maxPrompts) {
                    const upgradeMsg = subscriptionStatus === 'freemium' ? ' Upgrade to Premium for 50 slots.' : '';
                    alert(`Maximum ${maxPrompts} prompts allowed in library.${upgradeMsg}`);
                    return;
                }
                
                library.push({
                    title,
                    content,
                    timestamp: Date.now()
                });
            }
            
            await browser.storage.local.set({ promptLibrary: library });
            loadLibrary();
            closeModal();
        } catch (error) {
            console.error('Error saving prompt:', error);
            alert('Error saving prompt');
        }
    }

    // Global functions for inline event handlers
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Could show a toast notification here
            console.log('Copied to clipboard');
        });
    };

    window.saveToLibrary = function(content) {
        openPromptModal('Optimized Prompt', content);
    };

    window.editPrompt = async function(index) {
        try {
            const result = await browser.storage.local.get('promptLibrary');
            const library = result.promptLibrary || [];
            const prompt = library[index];
            if (prompt) {
                openPromptModal(prompt.title, prompt.content, index);
            }
        } catch (error) {
            console.error('Error loading prompt for editing:', error);
        }
    };

    window.deletePrompt = async function(index) {
        if (confirm('Are you sure you want to delete this prompt?')) {
            try {
                const result = await browser.storage.local.get('promptLibrary');
                const library = result.promptLibrary || [];
                library.splice(index, 1);
                await browser.storage.local.set({ promptLibrary: library });
                loadLibrary();
            } catch (error) {
                console.error('Error deleting prompt:', error);
            }
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
