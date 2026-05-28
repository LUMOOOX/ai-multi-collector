// ==UserScript==
// @name         AI Multi-Collector Universal
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Универсальный сборщик кода для DeepSeek, Gemini и ChatGPT v2.0: нумерация блоков, раздельное выделение, защита от дурака, горячие клавиши, автоочистка, сброс при смене чата
// @author       LUMOOOX
// @license      MIT
// @match        https://chat.deepseek.com/*
// @match        https://gemini.google.com/*
// @match        https://chatgpt.com/*
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%233b82f6' viewBox='0 0 24 24'%3E%3Cpath d='M8 6L2 12L8 18L9.5 16.5L5 12L9.5 7.5L8 6ZM16 6L14.5 7.5L19 12L14.5 16.5L16 18L22 12L16 6Z'/%3E%3C/svg%3E
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @run-at       document-end
// @downloadURL https://update.greasyfork.org/scripts/577321/AI%20Multi-Collector%20Universal.user.js
// @updateURL https://update.greasyfork.org/scripts/577321/AI%20Multi-Collector%20Universal.meta.js
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
            clickBot: 'Click code blocks or messages', clickArea: 'Click on message area',
            botOnly: 'Bot replies only', selectFirst: 'Select first',
            noCode: 'No code found', selected: 'Selected', resetMsg: 'Reset',
            copied: 'Copied', block: 'block', blocks: 'blocks', chars: 'chars',
            maxBlocks: 'Max 50 blocks', storageError: 'Storage error', fullReset: 'Full reset'
        },
        ru: {
            ready: 'Готов', select: 'Выбрать', copy: 'Копировать', reset: 'Сброс',
            clickBot: 'Клик по блокам кода или сообщениям', clickArea: 'Кликните по области сообщения',
            botOnly: 'Только ответы бота', selectFirst: 'Сначала выберите',
            noCode: 'Код не найден', selected: 'Выбрано', resetMsg: 'Сброшено',
            copied: 'Скопировано', block: 'блок', blocks: 'блоков', chars: 'симв.',
            maxBlocks: 'Максимум 50 блоков', storageError: 'Ошибка хранилища', fullReset: 'Полный сброс'
        }
    };
    const t = TEXTS[LANG];

    // Константы
    const MAX_BLOCKS = 50;
    const CLEANUP_INTERVAL = 30000;
    const URL_CHECK_INTERVAL = 1000;

// ========== 2. ОПРЕДЕЛЕНИЕ ПЛАТФОРМЫ ==========
    let currentPlatform = null;
    let platformName = '';
    let lastUrl = location.href;

    if (location.hostname.includes('chat.deepseek.com')) {
        platformName = 'deepseek';
        currentPlatform = {
            name: 'DeepSeek',
            botSelectors: '.ds-markdown, .message-content[data-message-role="assistant"], [data-message-id]',
            sidebarWidth: 280, minTextLength: 60,
            roleAttribute: 'data-message-role', roleValue: 'assistant'
        };
    } else if (location.hostname.includes('gemini.google.com')) {
        platformName = 'gemini';
        currentPlatform = {
            name: 'Gemini',
            botSelectors: 'model-response, .message-content',
            sidebarWidth: 300, minTextLength: 60,
            roleAttribute: null, roleValue: null
        };
    } else if (location.hostname.includes('chat.openai.com') || location.hostname.includes('chatgpt.com')) {
        platformName = 'chatgpt';
        currentPlatform = {
            name: 'ChatGPT',
            botSelectors: '[data-message-author-role="assistant"], .markdown, .prose',
            sidebarWidth: 260, minTextLength: 60,
            roleAttribute: 'data-message-author-role', roleValue: 'assistant'
        };
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

// ========== 3. СТИЛИ ПАНЕЛИ ==========
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
            top: 150px !important;
            right: 50px !important;
            z-index: 2147483647 !important;
            width: 110px !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #1e1e2e !important;
            border-radius: 12px !important;
            font-size: 13px !important;
            opacity: 0.25 !important;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        #ai-collector-panel:hover {
            opacity: 1 !important;
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

        @media (prefers-color-scheme: light) {
            #ai-collector-panel {
                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
            }
            .ai-title-bar {
                background: #f1f5f9 !important;
                border-bottom-color: #cbd5e1 !important;
            }
            .ai-title { color: #1e293b !important; }
            .ai-status { border-top-color: #e2e8f0 !important; }
        }
        .ai-hidden { display: none !important; }
    `);

// ========== 4. СТИЛИ ВЫДЕЛЕНИЯ ==========
    let highlightStyles = `
        .ai-collector-selected {
            outline: 1.5px dashed #3b82f6 !important;
            outline-offset: 4px !important;
            border-radius: 12px !important;
            transition: all 0.2s ease !important;
        }

        .ai-collector-block-selected {
            outline: 1.5px dashed #10b981 !important;
            outline-offset: 2px !important;
            border-radius: 16px !important;
            position: relative !important;
            transition: all 0.2s ease !important;
        }
    `;

    if (platformName === 'deepseek') {
        highlightStyles += `
            .ai-collector-selected.ds-markdown {
                outline: 1.5px dashed #3b82f6 !important;
                outline-offset: 6px !important;
            }
        `;
    } else if (platformName === 'gemini') {
        highlightStyles += `
            .ai-collector-selected,
            .ai-collector-selected model-response {
                outline: 1.5px dashed #3b82f6 !important;
                outline-offset: 20px !important;
                border-radius: 32px !important;
            }
            .ai-collector-block-selected {
                overflow: hidden !important;
            }
        `;
    } else if (platformName === 'chatgpt') {
        highlightStyles += `
            .ai-collector-selected .markdown {
                outline: 1.5px dashed #3b82f6 !important;
                outline-offset: 5px !important;
            }
        `;
    }

    GM_addStyle(highlightStyles);

// ========== 5. ПЕРЕМЕННЫЕ ==========
    let selectedElements = [];
    let selectedType = null;
    let blockCounter = 0;
    let picking = false;
    let panel = null;
    let timer = null;
    let clickTimeout = null;

// ========== 6. БАЗОВЫЕ ФУНКЦИИ ==========
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

    function cleanupDeadReferences() {
        const beforeCount = selectedElements.length;
        selectedElements = selectedElements.filter(el => el && document.body.contains(el));
        if (beforeCount !== selectedElements.length) {
            console.log(`[${currentPlatform.name}] Cleaned ${beforeCount - selectedElements.length} dead references`);
            // ИСПРАВЛЕНО: пересчитываем нумерацию блоков кода после очистки мертвых ссылок
            if (selectedType === 'codeblock' && selectedElements.length > 0) {
                updateBlockNumbers();
            }
        }
    }

    function isValidMessage(el) {
        if (!el) return false;
        const text = el.innerText || '';
        const len = text.length;
        return len >= CONFIG.minTextLength && len < 100000;
    }

    function getSafeText(element) {
        if (!element || !element.innerText) return '';
        return element.innerText.trim();
    }

    function isInteractiveElement(target) {
        if (target.closest('button[aria-label*="Copy"], button[aria-label*="Копировать"], button[aria-label*="Скачать код"]')) {
            return true;
        }
        if (target.closest('[role="button"], .feedback-buttons, .regenerate-button, .copy-button')) {
            return true;
        }
        return false;
    }

function isBotMessage(element) {
        if (!element) return false;

        if (platformName === 'chatgpt') {
            let msgElement = element.closest('[data-message-author-role="assistant"]');
            if (msgElement) return true;
            msgElement = element.closest(CONFIG.botSelectors);
            if (msgElement) return true;
            return false;
        }

        let msgElement = element.closest(CONFIG.botSelectors);
        if (!msgElement) return false;
        if (CONFIG.roleAttribute && CONFIG.roleValue) {
            const role = msgElement.getAttribute(CONFIG.roleAttribute);
            if (role === CONFIG.roleValue) return true;
        }
        if (msgElement.tagName === 'MODEL-RESPONSE') return true;
        const classes = msgElement.className || '';
        if (classes.includes('ds-markdown')) return true;
        const text = getSafeText(msgElement);
        if (text.length < 30) return false;
        const hasCode = msgElement.querySelector('pre, code');
        if (hasCode && text.length > 100) return true;
        if (text.length > 200) return true;
        return false;
    }

    function findBotMessage(element) {
        if (!element) return null;

        if (platformName === 'deepseek') {
            if (element.closest('._121d384, .md-code-block, button[aria-label*="Copy"], button[aria-label*="Копировать"]')) return null;
            if (element.closest('pre')) return null;
            let msgElement = element.closest('.ds-markdown, [data-message-role="assistant"]');
            if (msgElement) return msgElement;
            return null;
        }

        if (platformName === 'chatgpt') {
            if (element.closest('pre')) return null;
            if (element.closest('button[aria-label*="Copy"], button[aria-label*="Копировать"]')) return null;
            if (element.closest('[class*="code-block"], [class*="codeBlock"], .cm-editor, #code-block-viewer')) return null;

            let msgContainer = element.closest('[data-message-author-role="assistant"]');
            if (msgContainer) {
                const textContainer = msgContainer.querySelector('.markdown, .prose');
                if (textContainer) return textContainer;
                return msgContainer;
            }
            let markdown = element.closest('.markdown');
            if (markdown) return markdown;
            return null;
        }

        if (platformName === 'gemini') {
            if (element.closest('button[aria-label*="Copy"], button[aria-label*="Копировать"], button[aria-label*="Скачать код"]')) return null;
            if (element.closest('code-block, .code-block, [class*="code-block"]')) return null;
            if (element.closest('pre')) return null;
        }

        let botEl = element.closest(CONFIG.botSelectors);
        if (botEl && isBotMessage(botEl)) {
            if (currentPlatform.name === 'Gemini') {
                const textContainer = botEl.querySelector('.markdown, .prose, [data-message-content]');
                if (textContainer) return textContainer;
            }
            return botEl;
        }

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

function findFullCodeBlock(element) {
        if (!element) return null;

        let copyButton = element.closest('button[aria-label*="Copy"], button[aria-label*="Копировать"]');
        if (copyButton) {
            let container = copyButton.closest('.flex.w-full.items-center.justify-between, .group, .relative');
            if (container) {
                let pre = container.querySelector('pre');
                if (pre) return container;
            }
        }

        let pre = element.tagName === 'PRE' ? element : element.closest('pre');
        if (!pre) {
            let header = element.closest('.flex.w-full.items-center.justify-between');
            if (header) {
                let foundPre = header.parentElement?.querySelector('pre');
                if (foundPre) return header.parentElement;
            }
            return pre;
        }

        if (platformName === 'gemini') {
            let parent = pre.parentElement;
            for (let i = 0; i < 10 && parent && parent !== document.body; i++) {
                if (parent.classList && (
                    parent.classList.toString().includes('code-block') ||
                    parent.classList.toString().includes('code-container') ||
                    parent.classList.toString().includes('CodeBlock') ||
                    parent.getAttribute('data-testid') === 'code-block'
                )) {
                    return parent;
                }
                if (parent.querySelector && parent.querySelector('button[aria-label*="Copy"], button[aria-label*="Копировать"]')) {
                    return parent;
                }
                parent = parent.parentElement;
            }
            return pre.closest('div');
        }

        if (platformName === 'deepseek') {
            let container = pre.closest('.md-code-block');
            if (container) return container;
            let parent = pre.parentElement;
            for (let i = 0; i < 6 && parent && parent !== document.body; i++) {
                if (parent.classList && parent.classList.contains('md-code-block')) return parent;
                parent = parent.parentElement;
            }
            return pre.closest('.ds-markdown, .message-content');
        }

        // ИСПРАВЛЕНО: для ChatGPT ищем компактную обертку, а не любой родитель с кнопкой
        if (platformName === 'chatgpt') {
            // Сначала ищем ближайший контейнер с классом code-block или group
            let codeContainer = pre.closest('.flex.w-full.flex-col, .group, .relative, .code-block');
            if (codeContainer && codeContainer.querySelector('button[aria-label*="Copy"], button[aria-label*="Копировать"]')) {
                return codeContainer;
            }
            // Если не нашли, поднимаемся до markdown контейнера
            return pre.closest('.flex.w-full, .markdown');
        }

        return pre;
    }

// ========== 7. ФУНКЦИИ ВЫДЕЛЕНИЯ ==========
    function clearVisualSelection() {
        for (let el of selectedElements) {
            if (!el) continue;
            el.classList.remove('ai-collector-selected', 'ai-collector-block-selected');
            const indicator = el.querySelector(':scope > .ai-block-number-indicator');
            if (indicator) indicator.remove();
            el.removeAttribute('data-block-number');
        }
    }

    function resetSelection() {
        clearVisualSelection();
        selectedElements = [];
        selectedType = null;
        blockCounter = 0;
        picking = false;
        setStatus(t.resetMsg, '#94a3b8');
    }

    function addBlockNumber(element, number) {
        if (!element || !element.isConnected) return;

        const oldIndicator = element.querySelector(':scope > .ai-block-number-indicator');
        if (oldIndicator) oldIndicator.remove();

        const indicator = document.createElement('div');
        indicator.className = 'ai-block-number-indicator';
        indicator.textContent = number;

        let topOffset = 5;
        let leftOffset = 5;
        let rightOffset = 'auto';

        if (platformName === 'deepseek') {
            topOffset = 12;
            leftOffset = 90;
            rightOffset = 'auto';
        } else if (platformName === 'chatgpt') {
            topOffset = 15;
            leftOffset = 125;
            rightOffset = 'auto';
        } else if (platformName === 'gemini') {
            topOffset = 33;
            leftOffset = 110;
            rightOffset = 'auto';
        }

        indicator.style.cssText = `
            position: absolute;
            top: ${topOffset}px;
            ${leftOffset !== 'auto' ? `left: ${leftOffset}px;` : ''}
            ${rightOffset !== 'auto' ? `right: ${rightOffset}px;` : ''}
            background: #10b981;
            color: white;
            font-size: 10px;
            font-weight: bold;
            width: 18px;
            height: 18px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        if (window.getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }

        element.appendChild(indicator);
        element.setAttribute('data-block-number', number);
    }

    function removeBlockNumber(element) {
        if (!element) return;
        const indicator = element.querySelector(':scope > .ai-block-number-indicator');
        if (indicator) indicator.remove();
        element.removeAttribute('data-block-number');
    }

    function updateBlockNumbers() {
        let counter = 1;
        for (let el of selectedElements) {
            if (el && el.classList.contains('ai-collector-block-selected')) {
                addBlockNumber(el, counter++);
            }
        }
        blockCounter = counter - 1;
    }

    function toggleElementSelection(el, isCodeBlock) {
        if (!el || !el.classList) {
            console.warn('[AI-Collector] Invalid element');
            return;
        }

        const index = selectedElements.indexOf(el);

        // Проверка на удаление существующего элемента (снимаем выделение)
        if (index > -1) {
            el.classList.remove('ai-collector-selected', 'ai-collector-block-selected');
            removeBlockNumber(el);
            selectedElements.splice(index, 1);

            if (selectedElements.length === 0) {
                selectedType = null;
                blockCounter = 0;
            } else {
                if (selectedType === 'codeblock') {
                    updateBlockNumbers();
                }
            }

            if (selectedElements.length > 0) {
                setStatus(`${t.selected} (${selectedElements.length})`, '#10b981');
            } else {
                setStatus(t.ready, '#94a3b8');
            }
            return;
        }

        // ИСПРАВЛЕНО: проверка на лимит только при добавлении нового элемента
        if (selectedElements.length >= MAX_BLOCKS) {
            setStatus(`${t.maxBlocks} (${MAX_BLOCKS})`, '#ef4444');
            return;
        }

        if (selectedType === null) {
            selectedType = isCodeBlock ? 'codeblock' : 'message';
        } else if ((selectedType === 'codeblock' && !isCodeBlock) ||
                   (selectedType === 'message' && isCodeBlock)) {
            setStatus('Нельзя смешивать блоки кода и сообщения', '#ef4444');
            return;
        }

        // Добавление нового элемента
        selectedElements.push(el);
        if (isCodeBlock) {
            el.classList.add('ai-collector-block-selected');
            blockCounter++;
            addBlockNumber(el, blockCounter);
        } else {
            el.classList.add('ai-collector-selected');
        }

        setStatus(`${t.selected} (${selectedElements.length})`, '#10b981');
    }

// ========== 8. ФУНКЦИЯ КОПИРОВАНИЯ (С СОРТИРОВКОЙ ПО ПОЗИЦИИ) ==========
    async function copyCode() {
        if (selectedElements.length === 0) {
            setStatus(t.selectFirst, '#f59e0b');
            return;
        }

        let blocks = [];

        function cleanBlock(text) {
            let lines = text.split('\n');
            if (lines.length === 0) return text;

            if (lines[0].startsWith('```') && lines[0].length > 3) {
                lines[0] = '```';
                return lines.join('\n').trim();
            }

            return text;
        }

        function isExactDuplicate(text, existingBlocks) {
            if (existingBlocks.length === 0) return false;
            let lastBlock = existingBlocks[existingBlocks.length - 1];
            return lastBlock === text;
        }

        let sortedElements = [...selectedElements];

        if (selectedType === 'codeblock') {
            // Для блоков кода - сортировка по номерам
            sortedElements.sort((a, b) => {
                let numA = parseInt(a.getAttribute('data-block-number')) || 0;
                let numB = parseInt(b.getAttribute('data-block-number')) || 0;
                return numA - numB;
            });
        } else if (selectedType === 'message') {
            // ДЛЯ СООБЩЕНИЙ - сортировка по позиции на странице (сверху вниз)
            sortedElements.sort((a, b) => {
                if (!a || !b) return 0;
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                return rectA.top - rectB.top;
            });
        }

        for (let selected of sortedElements) {
            if (!selected) continue;

            let allPres = selected.tagName === 'PRE' ? [selected] : selected.querySelectorAll('pre');

            if (selectedType === 'message' && allPres.length > 0) {
                for (let p of allPres) {
                    let rawTxt = getSafeText(p);
                    if (!rawTxt) continue;
                    let cleanedTxt = cleanBlock(rawTxt);
                    if (cleanedTxt && !isExactDuplicate(cleanedTxt, blocks)) {
                        blocks.push(cleanedTxt);
                    }
                }
            }
            else if (selectedType === 'codeblock') {
                let pre = selected.tagName === 'PRE' ? selected : selected.querySelector('pre');
                if (pre) {
                    let rawTxt = getSafeText(pre);
                    if (rawTxt) {
                        let cleanedTxt = cleanBlock(rawTxt);
                        if (cleanedTxt && !isExactDuplicate(cleanedTxt, blocks)) {
                            blocks.push(cleanedTxt);
                        }
                    }
                } else {
                    let rawTxt = getSafeText(selected);
                    if (rawTxt) {
                        let cleanedTxt = cleanBlock(rawTxt);
                        if (cleanedTxt && !isExactDuplicate(cleanedTxt, blocks)) {
                            blocks.push(cleanedTxt);
                        }
                    }
                }
            }
            else if (allPres.length === 0) {
                let allCodes = selected.querySelectorAll('code');
                for (let c of allCodes) {
                    if (c.closest('pre')) continue;
                    let rawTxt = getSafeText(c);
                    if (!rawTxt) continue;
                    let cleanedTxt = cleanBlock(rawTxt);
                    if (cleanedTxt && !isExactDuplicate(cleanedTxt, blocks)) {
                        blocks.push(cleanedTxt);
                    }
                }
            }
        }

        if (blocks.length === 0) {
            setStatus(t.noCode, '#ef4444');
            return;
        }

        let result = blocks.join('\n\n');
        const totalChars = result.length;
        let blockWord = blocks.length === 1 ? t.block : t.blocks;
        let statusMsg = `${t.copied}: ${blocks.length} ${blockWord} (${totalChars} ${t.chars})`;

        try {
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(result, 'text');
                setStatus(statusMsg, '#10b981');
            } else {
                await navigator.clipboard.writeText(result);
                setStatus(statusMsg, '#10b981');
            }
        } catch(e) {
            let ta = document.createElement('textarea');
            ta.value = result;
            ta.style.cssText = 'position:fixed;top:-1000px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            setStatus(statusMsg, '#10b981');
        }
    }

// ========== 9. СОЗДАНИЕ UI ПАНЕЛИ ==========
    function createPanel() {
        if (document.getElementById('ai-collector-panel')) return document.getElementById('ai-collector-panel');
        let div = document.createElement('div');
        div.id = 'ai-collector-panel';
        let titleBar = document.createElement('div');
        titleBar.className = 'ai-title-bar';
        let title = document.createElement('span');
        title.className = 'ai-title';
        title.textContent = 'LUMOOOX';
        titleBar.appendChild(title);
        let content = document.createElement('div');
        content.className = 'ai-content';
        let btnPick = document.createElement('button');
        btnPick.textContent = t.select;
        btnPick.className = 'ai-btn ai-pick';
        btnPick.onclick = () => {
            picking = !picking;
            setStatus(picking ? t.clickBot : t.ready, picking ? '#f59e0b' : '#94a3b8');
        };
        let btnCopy = document.createElement('button');
        btnCopy.textContent = t.copy;
        btnCopy.className = 'ai-btn ai-copy';
        btnCopy.onclick = () => copyCode();
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

// ========== 10. ОБРАБОТЧИКИ СОБЫТИЙ ==========
    function handleClick(e) {
        if (!picking && selectedElements.length === 0) return;
        if (e.target.closest && e.target.closest('#ai-collector-panel')) return;
        if (clickTimeout) return;
        clickTimeout = setTimeout(() => { clickTimeout = null; }, 100);

        if (picking) {
            if (!isMainArea(e.clientX, e.clientY)) {
                setStatus(t.clickArea, '#ef4444');
                picking = false;
                return;
            }

            // GEMINI
            if (platformName === 'gemini') {
                let clickedCopyButton = e.target.closest('button[aria-label*="Copy"], button[aria-label*="Копировать"], button[aria-label*="Скачать код"]');
                let clickedCodeBlock = e.target.closest('code-block, .code-block');

                if (clickedCopyButton || clickedCodeBlock) {
                    let pre = null;
                    if (clickedCopyButton) {
                        let container = clickedCopyButton.closest('code-block, .code-block');
                        if (container) pre = container.querySelector('pre');
                    }
                    if (!pre && clickedCodeBlock) pre = clickedCodeBlock.querySelector('pre');

                    if (pre && isBotMessage(pre)) {
                        let elementToSelect = findFullCodeBlock(pre);
                        if (elementToSelect) toggleElementSelection(elementToSelect, true);
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                }
            }

            // DEEPSEEK
            if (platformName === 'deepseek') {
                let clickedHeader = e.target.closest('._121d384, .md-code-block, button[aria-label*="Copy"], button[aria-label*="Копировать"]');
                if (clickedHeader) {
                    let container = clickedHeader.closest('.md-code-block');
                    if (container) {
                        let pre = container.querySelector('pre');
                        if (pre && isBotMessage(pre)) {
                            let elementToSelect = findFullCodeBlock(pre);
                            if (elementToSelect) toggleElementSelection(elementToSelect, true);
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                    }
                }
            }

            // CHATGPT - игнорируем клики на шапку
            if (platformName === 'chatgpt') {
                let clickedHeader = e.target.closest('.flex.w-full.items-center.justify-between');
                let clickedCopyButton = e.target.closest('button[aria-label*="Copy"], button[aria-label*="Копировать"]');

                if (clickedHeader || clickedCopyButton) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // ОБЩАЯ ПРОВЕРКА: клик на pre
            let clickedPre = e.target.closest('pre');
            if (clickedPre && isBotMessage(clickedPre)) {
                let elementToSelect = findFullCodeBlock(clickedPre);
                if (elementToSelect) toggleElementSelection(elementToSelect, true);
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // ОБЫЧНОЕ СООБЩЕНИЕ
            let msg = findBotMessage(e.target);
            if (!msg || !isValidMessage(msg)) {
                setStatus(t.botOnly, '#ef4444');
                picking = false;
                return;
            }
            toggleElementSelection(msg, false);
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (selectedElements.length > 0 && !picking) {
            if (isInteractiveElement(e.target)) {
                return;
            }

            let clickedInsideAny = false;
            for (let el of selectedElements) {
                if (el && el.contains(e.target)) {
                    clickedInsideAny = true;
                    break;
                }
            }
            if (!clickedInsideAny) {
                resetSelection();
            }
        }
    }

    function handleKey(e) {
        if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'р')) {
            e.preventDefault();
            if (panel) panel.classList.toggle('ai-hidden');
            return;
        }
        if (e.ctrlKey && (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'и')) {
            e.preventDefault();
            picking = true;
            setStatus(t.clickBot, '#f59e0b');
            return;
        }
        if (e.ctrlKey && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'с')) {
            if (selectedElements.length > 0) {
                e.preventDefault();
                copyCode();
            }
            return;
        }
        if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к')) {
            e.preventDefault();
            resetSelection();
            setStatus(t.fullReset, '#f59e0b');
            return;
        }
        if (e.key === 'Escape') {
            resetSelection();
        }
    }

    function handleTouch(e) {
        if (!picking && selectedElements.length === 0) return;
        if (e.target.closest && e.target.closest('#ai-collector-panel')) return;
        const touch = e.touches[0];
        if (touch) {
            e.clientX = touch.clientX;
            e.clientY = touch.clientY;
            handleClick(e);
        }
    }

    function checkUrlChange() {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            if (selectedElements.length > 0) {
                resetSelection();
                console.log('[AI-Collector] Reset selection due to URL change');
            }
        }
    }

// ========== 11. ЗАПУСК СКРИПТА ==========
    function init() {
        panel = createPanel();
        setInterval(cleanupDeadReferences, CLEANUP_INTERVAL);
        setInterval(checkUrlChange, URL_CHECK_INTERVAL);
        window.addEventListener('popstate', () => resetSelection());
        console.log(`[${currentPlatform.name}] Ready - v3.6 (final stable)`);
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('touchstart', handleTouch, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
