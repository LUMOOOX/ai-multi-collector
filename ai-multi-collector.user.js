// ==UserScript==
// @name         AI Multi-Collector Universal
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Универсальный сборщик кода для DeepSeek, Gemini и ChatGPT
// @author       LUMOOOX
// @license      MIT
// @match        https://chat.deepseek.com/*
// @match        https://gemini.google.com/*
// @match        https://chatgpt.com/*
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%233b82f6' viewBox='0 0 24 24'%3E%3Cpath d='M8 6L2 12L8 18L9.5 16.5L5 12L9.5 7.5L8 6ZM16 6L14.5 7.5L19 12L14.5 16.5L16 18L22 12L16 6Z'/%3E%3C/svg%3E
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @homepageURL  https://github.com/LUMOOOX/ai-multi-collector
// @supportURL   https://github.com/LUMOOOX/ai-multi-collector/issues
// @downloadURL  https://update.greasyfork.org/scripts/577321/AI%20Multi-Collector%20Universal.user.js
// @updateURL    https://update.greasyfork.org/scripts/577321/AI%20Multi-Collector%20Universal.meta.js
// ==/UserScript==

(function() {
    'use strict';

    if (window.__aiCollectorInstalled) return;
    window.__aiCollectorInstalled = true;

// ========== 1. НАСТРОЙКИ ЛОКАЛИЗАЦИИ ==========
    const LANG = (navigator.language || navigator.userLanguage || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';

    const TEXTS = {
        en: {
            ready: 'Ready', select: 'Select', copy: 'Copy', reset: 'Reset',
            clickBot: 'Click on bot message', clickArea: 'Click on message area',
            botOnly: 'Bot replies only', selectFirst: 'Select message first',
            noCode: 'No code found', selected: 'Selected', resetMsg: 'Reset',
            copied: 'Copied', block: 'block', blocks: 'blocks', chars: 'chars'
        },
        ru: {
            ready: 'Готов', select: 'Выбрать', copy: 'Копировать', reset: 'Сброс',
            clickBot: 'Кликните по ответу бота', clickArea: 'Кликните по области сообщения',
            botOnly: 'Только ответы бота', selectFirst: 'Сначала выберите',
            noCode: 'Код не найден', selected: 'Выбрано', resetMsg: 'Сброшено',
            copied: 'Скопировано', block: 'блок', blocks: 'блоков', chars: 'симв.'
        }
    };
    const t = TEXTS[LANG];

// ========== 2. КОНФИГУРАЦИЯ ПЛАТФОРМ ==========
    const PLATFORMS = {
        deepseek: {
            name: 'DeepSeek',
            botSelectors: '.ds-markdown, .message-content[data-message-role="assistant"], [data-message-id]',
            sidebarWidth: 280, minTextLength: 60,
            roleAttribute: 'data-message-role', roleValue: 'assistant'
        },
        gemini: {
            name: 'Gemini',
            botSelectors: 'model-response, .message-content', // УБРАЛ user-query
            sidebarWidth: 300, minTextLength: 60,
            roleAttribute: null, roleValue: null
        },
        chatgpt: {
            name: 'ChatGPT',
            botSelectors: '[data-message-author-role="assistant"], .markdown, .prose',
            sidebarWidth: 260, minTextLength: 60,
            roleAttribute: 'data-message-author-role', roleValue: 'assistant'
        }
    };

// ========== 3. ОПРЕДЕЛЕНИЕ ТЕКУЩЕЙ ПЛАТФОРМЫ ==========
    let currentPlatform = null;
    if (location.hostname.includes('chat.deepseek.com')) {
        currentPlatform = PLATFORMS.deepseek;
    } else if (location.hostname.includes('gemini.google.com')) {
        currentPlatform = PLATFORMS.gemini;
    } else if (location.hostname.includes('chat.openai.com') || location.hostname.includes('chatgpt.com')) {
        currentPlatform = PLATFORMS.chatgpt;
    } else {
        console.warn('[AI-Collector] Platform not supported');
        return;
    }

    const CONFIG = {
        botSelectors: currentPlatform.botSelectors,
        sidebarWidth: currentPlatform.sidebarWidth,
        minTextLength: currentPlatform.minTextLength,
        roleAttribute: currentPlatform.roleAttribute,
        roleValue: currentPlatform.roleValue
    };

    console.log(`[${currentPlatform.name}] Started (${LANG})`);

// ========== 4. CSS СТИЛИ ==========
    GM_addStyle(`
        #ai-collector-panel,
        #ai-collector-panel *,
        #ai-collector-panel .ai-btn,
        #ai-collector-panel .ai-title,
        #ai-collector-panel .ai-status {
            box-sizing: border-box !important;
            text-transform: none !important;
            letter-spacing: normal !important;
            line-height: 1.2 !important;
            text-decoration: none !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }

        #ai-collector-panel {
            position: fixed !important;
            top: 70px !important;
            right: 70px !important;
            z-index: 2147483647 !important;
            width: 110px !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #1e1e2e !important;
            border-radius: 12px !important;
            font-size: 13px !important;
            border: 0px solid #3b82f6 !important;
        }
        .ai-title-bar {
            background: #2a2a3a !important;
            padding: 8px 10px !important;
            border-bottom: 1px solid #3b82f6 !important;
            text-align: center !important;
        }
        .ai-title {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #cbd5e1 !important;
        }
        .ai-content {
            padding: 8px !important;
        }
        .ai-btn {
            display: block !important;
            width: 100% !important;
            height: 32px !important;
            padding: 0px 10px !important;
            margin: 6px 0 !important;
            border: none !important;
            border-radius: 8px !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            line-height: 32px !important;
            cursor: pointer !important;
            color: white !important;
            text-align: center !important;
        }
        .ai-pick { background: #3b82f6 !important; }
        .ai-copy { background: #059669 !important; }
        .ai-reset { background: #6b7280 !important; }
        .ai-status {
            display: block !important;
            color: #94a3b8 !important;
            font-size: 11px !important;
            text-align: center !important;
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid #334155 !important;
        }
        .ai-selected {
            outline: 1px dashed #3b82f6 !important;
            outline-offset: 2px !important;
            background: rgba(59, 130, 246, 0.05) !important;
            border-radius: 8px !important;
            padding: 2px !important;
            margin: -2px !important;
        }
        .ai-selected .action-bar,
        .ai-selected [data-testid="action-bar"],
        .ai-selected .feedback-buttons,
        .ai-selected .copy-button,
        .ai-selected .regenerate-button {
            outline: none !important;
            background: transparent !important;
        }
        @media (prefers-color-scheme: light) {
            #ai-collector-panel {
                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
            }
            .ai-title-bar {
                background: #f1f5f9 !important;
                border-bottom-color: #cbd5e1 !important;
            }
            .ai-title {
                color: #1e293b !important;
            }
            .ai-status {
                border-top-color: #e2e8f0 !important;
            }
        }
        .ai-hidden {
            display: none !important;
        }
    `);

// ========== 5. ПЕРЕМЕННЫЕ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    let selected = null;
    let picking = false;
    let panel = null;
    let timer = null;

    function setStatus(msg, color) {
        const el = document.querySelector('#ai-status');
        if (!el) return;
        if (timer) clearTimeout(timer);
        el.textContent = msg;
        el.style.color = color || '#94a3b8';
        timer = setTimeout(() => {
            if (el.textContent === msg) {
                el.textContent = t.ready;
                el.style.color = '#94a3b8';
            }
        }, 1500);
    }

    function isMainArea(x, y) {
        if (x < CONFIG.sidebarWidth) return false;
        if (y < 50) return false;
        return true;
    }

    function saveLast() {
        if (selected && selected.innerText) {
            const prefix = currentPlatform.name + '_';
            GM_setValue(prefix + 'lastMsg', selected.innerText.slice(0, 100));
        }
    }

// ========== 6. ОСНОВНЫЕ ФУНКЦИИ ==========
    function isBotMessage(element) {
        if (!element) return false;
        let msgElement = element.closest(CONFIG.botSelectors);
        if (!msgElement) return false;
        if (CONFIG.roleAttribute && CONFIG.roleValue) {
            const role = msgElement.getAttribute(CONFIG.roleAttribute);
            if (role === CONFIG.roleValue) return true;
        }
        if (msgElement.tagName === 'MODEL-RESPONSE') return true;
        const classes = msgElement.className || '';
        if (classes.includes('ds-markdown')) return true;
        const text = msgElement.innerText || '';
        if (text.length < 30) return false;
        const hasCode = msgElement.querySelector('pre, code');
        if (hasCode && text.length > 100) return true;
        if (text.length > 200) return true;
        return false;
    }

    function findBotMessage(element) {
        if (!element) return null;

        let botEl = element.closest(CONFIG.botSelectors);
        if (botEl && isBotMessage(botEl)) {
            if (currentPlatform.name === 'Gemini') {
                const textContainer = botEl.querySelector('.markdown, .prose, [data-message-content]');
                if (textContainer) return textContainer;
            }
            return botEl;
        }

        // Упрощенный fallback только для Gemini (из-за Shadow DOM)
        if (currentPlatform.name === 'Gemini') {
            let current = element;
            for (let i = 0; i < 5 && current && current !== document.body; i++) {
                if (isBotMessage(current)) {
                    const textContainer = current.querySelector('.markdown, .prose, [data-message-content]');
                    if (textContainer) return textContainer;
                    return current;
                }
                current = current.parentElement;
            }
        }

        return null;
    }

    function isValidMessage(el) {
        if (!el) return false;
        let len = (el.innerText || '').length;
        return len >= CONFIG.minTextLength && len < 100000;
    }

    function selectMessage(el) {
        if (selected) selected.classList.remove('ai-selected');
        selected = el;
        selected.classList.add('ai-selected');
        saveLast();
        setStatus(t.selected, '#10b981');
        picking = false;
    }

    function resetSelection() {
        if (selected) selected.classList.remove('ai-selected');
        selected = null;
        picking = false;
        setStatus(t.resetMsg, '#94a3b8');
        const prefix = currentPlatform.name + '_';
        GM_setValue(prefix + 'lastMsg', '');
    }

// ========== 7. ФУНКЦИЯ КОПИРОВАНИЯ ==========
    async function copyCode() {
        if (!selected) {
            setStatus(t.selectFirst, '#f59e0b');
            return;
        }

        let blocks = [];
        let seenSignatures = new Set();

        const STOP_WORDS = new Set([
            'javascript', 'python', 'java', 'c++', 'c#', 'c', 'go', 'rust',
            'ruby', 'php', 'html', 'css', 'sql', 'typescript', 'swift',
            'kotlin', 'scala', 'perl', 'shell', 'bash', 'powershell',
            'json', 'xml', 'yaml', 'markdown', 'txt', 'text'
        ]);

        function cleanBlock(text, platform) {
            if (platform !== 'ChatGPT') return text;

            let lines = text.split('\n');
            if (lines.length === 0) return text;

            let firstLine = lines[0].trim().toLowerCase();

            // Проверка на код-блок с указанием языка
            if (firstLine.startsWith('```') && firstLine.length > 3) {
                let lang = firstLine.substring(3).trim();
                if (STOP_WORDS.has(lang) || /^[a-z]+$/i.test(lang)) {
                    lines[0] = '```';
                    return lines.join('\n').trim();
                }
            }

            if (STOP_WORDS.has(firstLine)) {
                console.log(`[AI-Collector] Removed header: "${lines[0].trim()}"`);
                lines.shift();
                return lines.join('\n').trim();
            }
            return text;
        }

        function isTotallyJunk(text) {
            let trimmed = text.trim().toLowerCase();
            if (STOP_WORDS.has(trimmed)) return true;
            return false;
        }

        function getSignature(text) {
            return text.substring(0, 100).trim().replace(/\s+/g, ' ');
        }

        let allPres = selected.querySelectorAll('pre');
        console.log(`[AI-Collector] Pre elements found: ${allPres.length}`);

        let filteredCount = 0;
        let cleanedCount = 0;

        for (let p of allPres) {
            let rawTxt = p.innerText.trim();
            if (!rawTxt) continue;
            if (isTotallyJunk(rawTxt)) {
                filteredCount++;
                console.log(`[AI-Collector] Skipped junk block: "${rawTxt}"`);
                continue;
            }
            let cleanedTxt = cleanBlock(rawTxt, currentPlatform.name);
            if (cleanedTxt !== rawTxt) cleanedCount++;
            if (!cleanedTxt) continue;
            let signature = getSignature(cleanedTxt);
            if (!seenSignatures.has(signature)) {
                blocks.push(cleanedTxt);
                seenSignatures.add(signature);
                console.log(`[AI-Collector] Block added (${cleanedTxt.length} chars)`);
            }
        }

        if (blocks.length === 0 && currentPlatform.name !== 'ChatGPT') {
            let allCodes = selected.querySelectorAll('code');
            for (let c of allCodes) {
                if (c.closest('pre')) continue;
                let rawTxt = c.innerText.trim();
                if (!rawTxt) continue;
                if (isTotallyJunk(rawTxt)) continue;
                let cleanedTxt = cleanBlock(rawTxt, currentPlatform.name);
                if (!cleanedTxt) continue;
                let signature = getSignature(cleanedTxt);
                if (!seenSignatures.has(signature)) {
                    blocks.push(cleanedTxt);
                    seenSignatures.add(signature);
                }
            }
        }

        if (blocks.length === 0) {
            let matches = (selected.innerText || '').match(/```[\s\S]*?```/g) || [];
            for (let m of matches) {
                let clean = m.replace(/^```\w*\n/, '').replace(/\n```$/, '').trim();
                if (!clean) continue;
                if (isTotallyJunk(clean)) continue;
                let cleanedTxt = cleanBlock(clean, currentPlatform.name);
                if (!cleanedTxt) continue;
                let signature = getSignature(cleanedTxt);
                if (!seenSignatures.has(signature)) {
                    blocks.push(cleanedTxt);
                    seenSignatures.add(signature);
                }
            }
        }

        console.log(`[AI-Collector] Junk blocks filtered: ${filteredCount}`);
        console.log(`[AI-Collector] Headers cleaned: ${cleanedCount}`);
        console.log(`[AI-Collector] Total blocks: ${blocks.length}`);

        if (blocks.length === 0) {
            setStatus(t.noCode, '#ef4444');
            return;
        }

        let result = blocks.join('\n\n');
        const totalChars = result.length;

        let blockWord = blocks.length === 1 ? t.block : t.blocks;
        let statusMsg = `${t.copied}: ${blocks.length} ${blockWord} (${totalChars} ${t.chars})`;

        try {
            await navigator.clipboard.writeText(result);
            setStatus(statusMsg, '#10b981');
            console.log(`[AI-Collector] Platform: ${currentPlatform.name}`);
            console.log(`[AI-Collector] Blocks copied: ${blocks.length}`);
            console.log(`[AI-Collector] Total size: ${totalChars} chars`);
        } catch(e) {
            let ta = document.createElement('textarea');
            ta.value = result;
            ta.style.cssText = 'position:fixed;top:-1000px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            setStatus(statusMsg, '#10b981');
            console.log(`[AI-Collector] Platform: ${currentPlatform.name} (fallback)`);
            console.log(`[AI-Collector] Blocks copied: ${blocks.length}`);
            console.log(`[AI-Collector] Total size: ${totalChars} chars`);
        }
    }

// ========== 8. СОЗДАНИЕ UI ПАНЕЛИ ==========
    function createPanel() {
        if (document.getElementById('ai-collector-panel')) return document.getElementById('ai-collector-panel');
        let div = document.createElement('div');
        div.id = 'ai-collector-panel';

        let titleBar = document.createElement('div');
        titleBar.className = 'ai-title-bar';

        let title = document.createElement('span');
        title.className = 'ai-title';
        title.textContent = 'AI Collector';

        titleBar.appendChild(title);

        let content = document.createElement('div');
        content.className = 'ai-content';

        let btnPick = document.createElement('button');
        btnPick.textContent = t.select;
        btnPick.className = 'ai-btn ai-pick';
        btnPick.onclick = () => { picking = true; setStatus(t.clickBot, '#f59e0b'); };

        let btnCopy = document.createElement('button');
        btnCopy.textContent = t.copy;
        btnCopy.className = 'ai-btn ai-copy';
        btnCopy.onclick = copyCode;

        let btnReset = document.createElement('button');
        btnReset.textContent = t.reset;
        btnReset.className = 'ai-btn ai-reset';
        btnReset.onclick = resetSelection;

        let statusDiv = document.createElement('div');
        statusDiv.id = 'ai-status';
        statusDiv.className = 'ai-status';
        statusDiv.textContent = t.ready;

        content.appendChild(btnPick);
        content.appendChild(btnCopy);
        content.appendChild(btnReset);
        content.appendChild(statusDiv);

        div.appendChild(titleBar);
        div.appendChild(content);

        document.body.appendChild(div);
        return div;
    }

    // ========== 9. ОБРАБОТЧИКИ СОБЫТИЙ ==========
    function handleClick(e) {
        // Ранний выход для обычных кликов (оптимизация)
        if (!picking && !selected) return;

        if (e.target.closest && e.target.closest('#ai-collector-panel')) return;

        if (picking) {
            if (!isMainArea(e.clientX, e.clientY)) {
                setStatus(t.clickArea, '#ef4444');
                picking = false;
                return;
            }
            let msg = findBotMessage(e.target);
            if (!msg || !isValidMessage(msg)) {
                setStatus(t.botOnly, '#ef4444');
                picking = false;
                return;
            }
            selectMessage(msg);
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (selected && !picking) {
            const clickedOnSelected = selected.contains(e.target);
            if (!clickedOnSelected) resetSelection();
        }
    }

    function handleKey(e) {
        // Ctrl + Shift + H (скрыть/показать)
        if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'р')) {
            e.preventDefault();
            if (panel) {
                panel.classList.toggle('ai-hidden');
            }
            return;
        }

        // Ctrl + B (выбрать сообщение)
        if (e.ctrlKey && (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'и')) {
            e.preventDefault();
            picking = true;
            setStatus(t.clickBot, '#f59e0b');
            return;
        }

        // Ctrl + C (копировать)
        if (e.ctrlKey && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'с')) {
            if (selected) {
                e.preventDefault();
                copyCode();
            }
            return;
        }

        // Escape (сброс)
        if (e.key === 'Escape') {
            resetSelection();
            picking = false;
        }
    }

// ========== 10. ЗАПУСК СКРИПТА ==========
    function init() {
        // document.body гарантированно существует при @run-at document-end
        panel = createPanel();
        const prefix = currentPlatform.name + '_';
        let last = GM_getValue(prefix + 'lastMsg', '');
        if (last) {
            setTimeout(() => {
                let candidates = document.querySelectorAll(CONFIG.botSelectors);
                for (let m of candidates) {
                    if (isBotMessage(m) && (m.innerText || '').startsWith(last)) {
                        selectMessage(m);
                        break;
                    }
                }
            }, 500);
        }
        console.log(`[${currentPlatform.name}] Ready`);
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
