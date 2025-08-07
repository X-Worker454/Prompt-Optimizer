(function() {
    'use strict';

    let optimizationToolbar = null;
    let isOptimizing = false;
    let currentTextArea = null;
    let subscriptionStatus = 'freemium';
    let userId = null;

    // Initialize content script
    init();

    function init() {
        // Load subscription status
        loadSubscriptionStatus();
        
        // Start monitoring for text areas
        startDOMMonitoring();
        
        // Listen for messages from background script
        browser.runtime.onMessage.addListener(handleBackgroundMessage);
    }
    
    async function loadSubscriptionStatus() {
        try {
            const result = await browser.storage.local.get(['subscriptionStatus', 'userId']);
            subscriptionStatus = result.subscriptionStatus || 'freemium';
            userId = result.userId;
        } catch (error) {
            console.error('Error loading subscription status:', error);
        }
    }

    function startDOMMonitoring() {
        // Initial scan
        scanForTextAreas();
        
        // Set up mutation observer for dynamic content
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes contain text areas
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'TEXTAREA' || node.querySelector('textarea')) {
                                shouldScan = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldScan) {
                // Debounce scanning
                setTimeout(scanForTextAreas, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function scanForTextAreas() {
        const textAreas = document.querySelectorAll('textarea');
        
        textAreas.forEach((textArea) => {
            // Skip if already has optimization button
            if (textArea.dataset.optimoProcessed) return;
            
            // Check if this is likely a prompt input area
            if (isPromptTextArea(textArea)) {
                addOptimizationButton(textArea);
                textArea.dataset.optimoProcessed = 'true';
            }
        });
    }

    function isPromptTextArea(textArea) {
        // Check various indicators that this is a prompt input area
        const indicators = [
            // Common placeholder texts
            textArea.placeholder?.toLowerCase().includes('message'),
            textArea.placeholder?.toLowerCase().includes('ask'),
            textArea.placeholder?.toLowerCase().includes('chat'),
            textArea.placeholder?.toLowerCase().includes('prompt'),
            textArea.placeholder?.toLowerCase().includes('type'),
            
            // Common IDs and classes
            textArea.id?.toLowerCase().includes('prompt'),
            textArea.id?.toLowerCase().includes('message'),
            textArea.id?.toLowerCase().includes('input'),
            textArea.className?.toLowerCase().includes('prompt'),
            textArea.className?.toLowerCase().includes('message'),
            textArea.className?.toLowerCase().includes('input'),
            
            // Parent container indicators
            textArea.closest('[data-testid*="textbox"]'),
            textArea.closest('[class*="input"]'),
            textArea.closest('[class*="message"]'),
            textArea.closest('[class*="prompt"]'),
            
            // Size indicators (prompt areas are usually larger)
            textArea.offsetHeight > 50 || textArea.rows > 2
        ];
        
        return indicators.some(indicator => indicator);
    }

    function addOptimizationButton(textArea) {
        // Create the optimization trigger button
        const triggerButton = document.createElement('button');
        triggerButton.innerHTML = '⚡';
        triggerButton.title = 'Optimize with Optimo Prompt Ai';
        triggerButton.className = 'optimo-trigger-btn';
        triggerButton.type = 'button';
        
        // Style the trigger button
        Object.assign(triggerButton.style, {
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: '10000',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            fontSize: '16px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });

        // Position the button relative to the textarea
        const textAreaRect = textArea.getBoundingClientRect();
        const parent = textArea.offsetParent || document.body;
        
        // Make sure parent has relative positioning
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        
        parent.appendChild(triggerButton);
        
        // Position button relative to textarea
        const updateButtonPosition = () => {
            const rect = textArea.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            triggerButton.style.left = `${rect.right - parentRect.left - 40}px`;
            triggerButton.style.top = `${rect.top - parentRect.top + 8}px`;
        };
        
        updateButtonPosition();
        
        // Update position on window resize
        window.addEventListener('resize', updateButtonPosition);
        
        // Hover effects
        triggerButton.addEventListener('mouseenter', () => {
            triggerButton.style.transform = 'scale(1.1)';
            triggerButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        });
        
        triggerButton.addEventListener('mouseleave', () => {
            triggerButton.style.transform = 'scale(1)';
            triggerButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        });
        
        // Click handler to show optimization toolbar
        triggerButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showOptimizationToolbar(textArea, triggerButton);
        });
    }

    function showOptimizationToolbar(textArea, triggerButton) {
        // Remove existing toolbar if any
        if (optimizationToolbar) {
            optimizationToolbar.remove();
        }
        
        currentTextArea = textArea;
        
        // Create toolbar container
        optimizationToolbar = document.createElement('div');
        optimizationToolbar.className = 'optimo-toolbar';
        
        // Style the toolbar
        Object.assign(optimizationToolbar.style, {
            position: 'absolute',
            zIndex: '10001',
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(10px)',
            minWidth: '320px',
            maxWidth: '400px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            animation: 'optimoSlideIn 0.3s ease-out'
        });
        
        // Add CSS animation
        if (!document.getElementById('optimo-styles')) {
            const styles = document.createElement('style');
            styles.id = 'optimo-styles';
            styles.textContent = `
                @keyframes optimoSlideIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .optimo-toolbar input, .optimo-toolbar select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 13px;
                    margin-top: 4px;
                }
                .optimo-toolbar input:focus, .optimo-toolbar select:focus {
                    outline: none;
                    border-color: #FFA500;
                    box-shadow: 0 0 0 2px rgba(255, 165, 0, 0.2);
                }
                .optimo-toolbar label {
                    display: block;
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 4px;
                    margin-top: 12px;
                }
                .optimo-toolbar label:first-child {
                    margin-top: 0;
                }
                .optimo-toolbar optgroup {
                    font-weight: 500;
                    color: #666;
                }
                .optimo-toolbar option:disabled {
                    color: #ccc;
                    font-style: italic;
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Create toolbar content with premium feature gating
        optimizationToolbar.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">⚡</span>
                    <strong style="color: #333;">Optimo Prompt Ai</strong>
                    ${subscriptionStatus === 'premium' ? 
                        '<span style="background: #4CAF50; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 4px;">PRO</span>' : 
                        '<span style="background: #2196F3; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 4px;">FREE</span>'
                    }
                </div>
                <button id="closeToolbar" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
            </div>
            
            <label for="toneSelect">Tone:</label>
            <select id="toneSelect">
                <option value="Professional" selected>Professional</option>
                <option value="Friendly">Friendly</option>
                <option value="Direct">Direct</option>
                <option value="Creative">Creative</option>
                <option value="Empathetic">Empathetic</option>
                <option value="Authoritative">Authoritative</option>
                <option value="Humorous">Humorous</option>
                <option value="Persuasive">Persuasive</option>
                <option value="Analytical">Analytical</option>
                ${subscriptionStatus === 'premium' ? `
                    <optgroup label="Premium Tones">
                        <option value="Academic">🎓 Academic</option>
                        <option value="Journalistic">📰 Journalistic</option>
                        <option value="Technical">⚙️ Technical</option>
                        <option value="Legal">⚖️ Legal</option>
                    </optgroup>
                ` : `
                    <optgroup label="Premium Tones (Upgrade Required)">
                        <option value="Academic" disabled>🎓 Academic (Premium)</option>
                        <option value="Journalistic" disabled>📰 Journalistic (Premium)</option>
                        <option value="Technical" disabled>⚙️ Technical (Premium)</option>
                        <option value="Legal" disabled>⚖️ Legal (Premium)</option>
                    </optgroup>
                `}
            </select>
            
            <label for="lengthSelect">Length:</label>
            <select id="lengthSelect">
                <option value="Concise">Concise</option>
                <option value="Default" selected>Default</option>
                <option value="Elaborate">Elaborate</option>
            </select>
            
            ${subscriptionStatus === 'premium' ? `
                <label for="formatSelect">Output Format:</label>
                <select id="formatSelect">
                    <option value="Default" selected>Default Text</option>
                    <option value="JSON">📋 JSON Structure</option>
                    <option value="List">📝 Bullet List</option>
                    <option value="Table">📊 Table Format</option>
                    <option value="Steps">🔢 Step-by-Step</option>
                </select>
            ` : `
                <div style="margin-top: 12px; padding: 8px; background: #f5f5f5; border-radius: 6px; border-left: 3px solid #ffa500;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🔒 Premium Feature</div>
                    <div style="font-size: 11px; color: #888;">Output Format Control: JSON, Lists, Tables</div>
                </div>
            `}
            
            <label for="personaInput">Persona:</label>
            <input type="text" id="personaInput" placeholder="Copywriter, Student, Developer..." value="Expert">
            
            <label for="audienceInput">Audience:</label>
            <input type="text" id="audienceInput" placeholder="Beginner, Professional, Children..." value="General">
            
            ${subscriptionStatus === 'premium' ? `
                <label for="negativePromptInput">Advanced: Avoid These (Optional):</label>
                <input type="text" id="negativePromptInput" placeholder="jargon, technical terms, lengthy explanations..." style="font-size: 12px;">
            ` : `
                <div style="margin-top: 12px; padding: 8px; background: #f5f5f5; border-radius: 6px; border-left: 3px solid #ffa500;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🔒 Premium Feature</div>
                    <div style="font-size: 11px; color: #888;">Advanced Negative Prompting</div>
                </div>
            `}
            
            ${subscriptionStatus === 'freemium' ? `
                <div style="text-align: center; margin: 12px 0;">
                    <button id="upgradeBtn" style="
                        width: 100%;
                        padding: 8px;
                        background: linear-gradient(135deg, #4CAF50, #66BB6A);
                        border: none;
                        border-radius: 6px;
                        color: white;
                        font-weight: 500;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">
                        ✨ Upgrade to Premium
                    </button>
                </div>
            ` : ''}
            
            <button id="optimizeBtn" style="
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                font-size: 14px;
                cursor: pointer;
                margin-top: 16px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            ">
                <span>⚡</span>
                Optimize Prompt
            </button>
        `;
        
        // Position toolbar
        const rect = textArea.getBoundingClientRect();
        const parent = textArea.offsetParent || document.body;
        const parentRect = parent.getBoundingClientRect();
        
        parent.appendChild(optimizationToolbar);
        
        // Position below textarea
        optimizationToolbar.style.left = `${rect.left - parentRect.left}px`;
        optimizationToolbar.style.top = `${rect.bottom - parentRect.top + 8}px`;
        
        // Add event listeners
        document.getElementById('closeToolbar').addEventListener('click', hideOptimizationToolbar);
        document.getElementById('optimizeBtn').addEventListener('click', optimizePrompt);
        
        // Add premium feature gating
        const toneSelect = document.getElementById('toneSelect');
        if (toneSelect) {
            toneSelect.addEventListener('change', handleToneChange);
        }
        
        // Add upgrade button listener for freemium users
        const upgradeBtn = document.getElementById('upgradeBtn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', showUpgradePrompt);
        }
        
        // Close toolbar when clicking outside
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 100);
    }

    function handleOutsideClick(e) {
        if (optimizationToolbar && !optimizationToolbar.contains(e.target) && !e.target.classList.contains('optimo-trigger-btn')) {
            hideOptimizationToolbar();
        }
    }

    function hideOptimizationToolbar() {
        if (optimizationToolbar) {
            optimizationToolbar.remove();
            optimizationToolbar = null;
        }
        document.removeEventListener('click', handleOutsideClick);
    }

    async function optimizePrompt() {
        if (isOptimizing || !currentTextArea) return;
        
        const promptText = currentTextArea.value.trim();
        if (!promptText) {
            showNotification('Please enter a prompt to optimize', 'error');
            return;
        }
        
        // Get options from toolbar
        const tone = document.getElementById('toneSelect').value || 'Professional';
        const length = document.getElementById('lengthSelect').value;
        const format = document.getElementById('formatSelect')?.value || 'Default';
        const persona = document.getElementById('personaInput').value.trim() || 'Expert';
        const audience = document.getElementById('audienceInput').value.trim() || 'General';
        const negativePrompt = document.getElementById('negativePromptInput')?.value.trim() || '';
        
        // Check for premium feature usage by freemium users
        if (subscriptionStatus === 'freemium') {
            const premiumTones = ['Academic', 'Journalistic', 'Technical', 'Legal'];
            if (premiumTones.includes(tone)) {
                showUpgradePrompt('premium tone');
                return;
            }
            
            if (format && format !== 'Default') {
                showUpgradePrompt('output format control');
                return;
            }
            
            if (negativePrompt) {
                showUpgradePrompt('advanced negative prompting');
                return;
            }
        }
        
        const optimizeBtn = document.getElementById('optimizeBtn');
        
        // Set loading state
        isOptimizing = true;
        optimizeBtn.disabled = true;
        optimizeBtn.innerHTML = `
            <span style="animation: spin 1s linear infinite;">⚡</span>
            Optimizing...
        `;
        
        // Add spin animation
        if (!document.getElementById('optimo-spin-styles')) {
            const spinStyles = document.createElement('style');
            spinStyles.id = 'optimo-spin-styles';
            spinStyles.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(spinStyles);
        }
        
        try {
            // Send message to background script
            const response = await browser.runtime.sendMessage({
                action: 'optimizePrompt',
                data: {
                    promptText,
                    options: { tone, length, format, persona, audience, negativePrompt }
                }
            });
            
            if (response.success) {
                // Update textarea with optimized prompt
                currentTextArea.value = response.optimizedPrompt;
                
                // Trigger input event to notify the page
                currentTextArea.dispatchEvent(new Event('input', { bubbles: true }));
                currentTextArea.dispatchEvent(new Event('change', { bubbles: true }));
                
                showNotification('Prompt optimized successfully!', 'success');
                hideOptimizationToolbar();
            } else {
                showNotification(response.error || 'Optimization failed', 'error');
            }
        } catch (error) {
            console.error('Error optimizing prompt:', error);
            showNotification('Network error. Please try again.', 'error');
        } finally {
            // Reset button state
            isOptimizing = false;
            if (optimizeBtn) {
                optimizeBtn.disabled = false;
                optimizeBtn.innerHTML = `
                    <span>⚡</span>
                    Optimize Prompt
                `;
            }
        }
    }

    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.optimo-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'optimo-notification';
        
        const bgColor = type === 'success' ? '#4CAF50' : 
                       type === 'error' ? '#f44336' : '#2196F3';
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: bgColor,
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: '10002',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            animation: 'optimoSlideIn 0.3s ease-out',
            maxWidth: '300px'
        });
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function handleBackgroundMessage(message) {
        if (message.action === 'optimizationResult') {
            // Handle optimization result if needed
            return Promise.resolve();
        }
        
        if (message.action === 'subscriptionUpdated') {
            // Reload subscription status when updated
            loadSubscriptionStatus();
            return Promise.resolve();
        }
    }
    
    function handleToneChange(event) {
        const selectedTone = event.target.value;
        const premiumTones = ['Academic', 'Journalistic', 'Technical', 'Legal'];
        
        if (subscriptionStatus === 'freemium' && premiumTones.includes(selectedTone)) {
            // Reset to Professional and show upgrade prompt
            event.target.value = 'Professional';
            showUpgradePrompt('premium tone');
        }
    }
    
    function showUpgradePrompt(feature = 'premium feature') {
        const upgradeModal = document.createElement('div');
        upgradeModal.className = 'optimo-upgrade-modal';
        
        Object.assign(upgradeModal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: '10003',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'optimoSlideIn 0.3s ease-out'
        });
        
        upgradeModal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
                <h3 style="margin: 0 0 12px 0; color: #333;">Premium Feature</h3>
                <p style="color: #666; margin: 0 0 20px 0; line-height: 1.5;">
                    ${feature} is available in Premium. Get 50 daily optimizations, advanced tones, output formats, and more!
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="upgradeNowBtn" style="
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #4CAF50, #66BB6A);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s ease;
                    ">Upgrade Now</button>
                    <button id="closePremiumModal" style="
                        padding: 12px 24px;
                        background: #f5f5f5;
                        border: none;
                        border-radius: 8px;
                        color: #666;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background 0.2s ease;
                    ">Maybe Later</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(upgradeModal);
        
        // Add event listeners
        document.getElementById('upgradeNowBtn').addEventListener('click', () => {
            const upgradeUrl = userId ? 
                `https://optimo-prompt-ai.com?user_id=${userId}` :
                'https://optimo-prompt-ai.com';
            window.open(upgradeUrl, '_blank');
            upgradeModal.remove();
        });
        
        document.getElementById('closePremiumModal').addEventListener('click', () => {
            upgradeModal.remove();
        });
        
        // Close on outside click
        upgradeModal.addEventListener('click', (e) => {
            if (e.target === upgradeModal) {
                upgradeModal.remove();
            }
        });
    }
})();
