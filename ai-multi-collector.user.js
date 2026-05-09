// ==UserScript==
// @name         AI Multi-Collector Universal
// @name:ru      AI Multi-Collector Универсальный
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Universal code collector for DeepSeek, Gemini and ChatGPT. Select bot message and copy all code blocks.
// @description:ru  Универсальный сборщик кода для DeepSeek, Gemini и ChatGPT. Выделите ответ бота и скопируйте все блоки кода.
// @author       LUMOOOX
// @license      MIT
// @match        https://chat.deepseek.com/*
// @match        https://gemini.google.com/*
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%233b82f6' viewBox='0 0 24 24'%3E%3Cpath d='M8 6L2 12L8 18L9.5 16.5L5 12L9.5 7.5L8 6ZM16 6L14.5 7.5L19 12L14.5 16.5L16 18L22 12L16 6Z'/%3E%3C/svg%3E
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @downloadURL  https://github.com/LUMOOOX/ai-multi-collector/raw/main/ai-multi-collector.user.js
// @updateURL    https://github.com/LUMOOOX/ai-multi-collector/raw/main/ai-multi-collector.user.js
// @homepageURL  https://github.com/LUMOOOX/ai-multi-collector
// @homepageURL:ru https://github.com/LUMOOOX/ai-multi-collector
// @supportURL   https://github.com/LUMOOOX/ai-multi-collector/issues
// ==/UserScript==

(function() {
    'use strict';

    if (window.__aiCollectorInstalled) return;
    window.__aiCollectorInstalled = true;

    const LANG = (navigator.language || navigator.userLanguage || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';

    const TEXTS = {
        en: {
            ready: 'Ready',
            select: 'Select',
            copy: 'Copy',
            reset: 'Reset',
            clickBot: 'Click on bot message',
            clickArea: 'Click on message area',
            botOnly: 'Bot replies only',
            selectFirst: 'Select message first',
            noCode: 'No code found',
            selected: 'Selected',
            resetMsg: 'Reset',
            copied: 'Copied',
            block: 'block',
            blocks: 'blocks',
            chars: 'chars'
        },
        ru: {
            ready: 'Готов',
            select: 'Выбрать',
            copy: 'Копировать',
            reset: 'Сброс',
            clickBot: 'Кликните по ответу бота',
            clickArea: 'Кликните по области сообщения',
            botOnly: 'Только ответы бота',
            selectFirst: 'Сначала выберите',
            noCode: 'Код не найден',
            selected: 'Выбрано',
            resetMsg: 'Сброшено',
            copied: 'Скопировано',
            block: 'блок',
            blocks: 'блоков',
            chars: 'симв.'
        }
    };

    const t = TEXTS[LANG];

    const PLATFORMS = {
        deepseek: {
            name: 'DeepSeek',
            botSelectors: '.ds-markdown, .message-content[data-message-role="assistant"], [data-message-id]',
            sidebarWidth: 280,
            minTextLength: 60,
            roleAttribute: 'data-message-role',
            roleValue: 'assistant'
        },
        gemini: {
            name: 'Gemini',
            botSelectors: 'model-response, user-query, .message-content',
            sidebarWidth: 300,
            minTextLength: 60,
            roleAttribute: null,
            roleValue: null
        },
        chatgpt: {
            name: 'ChatGPT',
            botSelectors: '[data-message-author-role="assistant"], .markdown, .prose',
            sidebarWidth: 260,
            minTextLength: 60,
            roleAttribute: 'data-message-author-role',
            roleValue: 'assistant'
        }
    };

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

GM_addStyle(`
        #ai-collector-panel {
            position: fixed !important;
            top: 150px !important;
            right: 50px !important;
            z-index: 999999 !important;
            background: #1e1e2e !important;
            border: 0px solid #3b82f6 !important;
            border-radius: 12px !important;
            padding: 8px !important;
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
            height: auto !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            font-size: 13px !important;
            box-sizing: border-box !important;
            line-height: 1.4 !important;
        }
        .ai-btn {
            display: block !important;
            width: 100% !important;
            height: 32px !important;
            min-height: 32px !important;
            max-height: 32px !important;
            padding: 0px 10px !important;
            margin: 6px 0 !important;
            border: none !important;
            border-radius: 9px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            font-family: inherit !important;
            line-height: 32px !important;
            text-align: center !important;
            cursor: pointer !important;
            color: white !important;
            box-sizing: border-box !important;
        }
        .ai-pick { background: #3b82f6 !important; }
        .ai-copy { background: #059669 !important; }
        .ai-reset { background: #6b7280 !important; }
        .ai-status {
            display: block !important;
            color: #94a3b8 !important;
            font-size: 11px !important;
            font-family: inherit !important;
            text-align: center !important;
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid #334155 !important;
            line-height: 1.3 !important;
        }
        .ai-selected {
            outline: 1px dashed #3b82f6 !important;
            outline-offset: 2px !important;
            background: rgba(59, 130, 246, 0.05) !important;
            border-radius: 12px !important;
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
        #ai-collector-panel * {
            box-sizing: border-box !important;
        }
        @media (prefers-color-scheme: light) {
            #ai-collector-panel {
                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
            }
            .ai-status {
                border-top-color: #e2e8f0 !important;
            }
        }
    `);

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

    function saveLast() {
        if (selected && selected.innerText) {
            const prefix = currentPlatform.name + '_';
            GM_setValue(prefix + 'lastMsg', selected.innerText.slice(0, 100));
        }
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
        let current = element;
        for (let i = 0; i < 8 && current && current !== document.body; i++) {
            if (isBotMessage(current)) {
                if (currentPlatform.name === 'Gemini') {
                    const textContainer = current.querySelector('.markdown, .prose, [data-message-content]');
                    if (textContainer) return textContainer;
                }
                return current;
            }
            current = current.parentElement;
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
        if (panel) {
            panel.style.borderColor = '#10b981';
            setTimeout(() => { if (panel) panel.style.borderColor = '#3b82f6'; }, 1000);
        }
    }

    function resetSelection() {
        if (selected) selected.classList.remove('ai-selected');
        selected = null;
        picking = false;
        setStatus(t.resetMsg, '#94a3b8');
        if (panel) panel.style.borderColor = '#3b82f6';
        const prefix = currentPlatform.name + '_';
        GM_setValue(prefix + 'lastMsg', '');
    }

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
            } else {
                console.log(`[AI-Collector] Duplicate skipped`);
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

function createPanel() {
        if (document.getElementById('ai-collector-panel')) return document.getElementById('ai-collector-panel');
        let div = document.createElement('div');
        div.id = 'ai-collector-panel';

        let btnPick = document.createElement('button');
        btnPick.textContent = t.select;
        btnPick.className = 'ai-btn ai-pick';
        btnPick.onclick = () => { picking = true; setStatus(t.clickBot, '#f59e0b'); if (panel) panel.style.borderColor = '#f59e0b'; };

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

        div.appendChild(btnPick);
        div.appendChild(btnCopy);
        div.appendChild(btnReset);
        div.appendChild(statusDiv);

        document.body.appendChild(div);
        return div;
    }

    function handleClick(e) {
        if (picking) {
            if (e.target.closest && e.target.closest('#ai-collector-panel')) return;
            if (!isMainArea(e.clientX, e.clientY)) {
                setStatus(t.clickArea, '#ef4444');
                picking = false;
                if (panel) panel.style.borderColor = '#3b82f6';
                return;
            }
            let msg = findBotMessage(e.target);
            if (!msg || !isValidMessage(msg)) {
                setStatus(t.botOnly, '#ef4444');
                picking = false;
                if (panel) panel.style.borderColor = '#3b82f6';
                return;
            }
            selectMessage(msg);
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (selected && !picking) {
            if (e.target.closest && e.target.closest('#ai-collector-panel')) return;
            const clickedOnSelected = selected.contains(e.target);
            if (!clickedOnSelected) {
                resetSelection();
            }
        }
    }

    function handleKey(e) {
        if (e.ctrlKey && (e.key === 'b' || e.key === 'и')) {
            e.preventDefault();
            picking = true;
            setStatus(t.clickBot, '#f59e0b');
            if (panel) panel.style.borderColor = '#f59e0b';
            return;
        }
        if (e.ctrlKey && (e.key === 'c' || e.key === 'с')) {
            if (selected) {
                e.preventDefault();
                copyCode();
            }
            return;
        }
        if (e.key === 'Escape') {
            resetSelection();
            picking = false;
        }
    }

function init() {
        if (!document.body) { setTimeout(init, 1000); return; }
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
