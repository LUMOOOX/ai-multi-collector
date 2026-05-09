// ==UserScript==
// @name         AI Multi-Collector Universal
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Universal code collector for DeepSeek, Gemini and ChatGPT
// @description:ru  Универсальный сборщик кода для DeepSeek, Gemini и ChatGPT
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
// @supportURL   https://github.com/LUMOOOX/ai-multi-collector/issues
// ==/UserScript==

(function() {
    'use strict';

    // БЛОК 2.1: ЗАЩИТА ОТ ДВОЙНОГО ЗАПУСКА
    if (window.__aiCollectorInstalled) return;
    window.__aiCollectorInstalled = true;

    // БЛОК 2.2: ОПРЕДЕЛЕНИЕ ЯЗЫКА
    const LANG = (navigator.language || navigator.userLanguage || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';

    // БЛОК 2.3: ТЕКСТЫ ИНТЕРФЕЙСА (EN/RU)
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

// БЛОК 3.1: НАСТРОЙКИ ДЛЯ КАЖДОГО САЙТА
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

    // БЛОК 3.2: ОПРЕДЕЛЕНИЕ ТЕКУЩЕЙ ПЛАТФОРМЫ
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

    // БЛОК 3.3: ФИНАЛЬНАЯ КОНФИГУРАЦИЯ
    const CONFIG = {
        botSelectors: currentPlatform.botSelectors,
        sidebarWidth: currentPlatform.sidebarWidth,
        minTextLength: currentPlatform.minTextLength,
        roleAttribute: currentPlatform.roleAttribute,
        roleValue: currentPlatform.roleValue
    };

    console.log(`[${currentPlatform.name}] Started (${LANG})`);

    // БЛОК 4.1: ОСНОВНЫЕ СТИЛИ ПАНЕЛИ
    // БЛОК 4.2: СТИЛИ КНОПОК
    // БЛОК 4.3: СТИЛИ СТАТУСА
    // БЛОК 4.4: СТИЛИ ВЫДЕЛЕНИЯ СООБЩЕНИЯ
    // БЛОК 4.5: СТИЛИ ДЛЯ GEMINI
    // БЛОК 4.6: СТИЛИ ДЛЯ СВЕТЛОЙ ТЕМЫ
    // БЛОК 4.7: СТИЛИ КНОПКИ-СВЁРТКИ С ПРОЗРАЧНОСТЬЮ
    GM_addStyle(`
        /* БЛОК 4.1: Панель управления */
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
            transition: all 0.2s ease !important;
        }

        /* БЛОК 4.7: Кнопка-свёртка (квадратная) с поддержкой прозрачности */
        #ai-collapse-btn {
            position: fixed !important;
            top: 150px !important;
            right: 50px !important;
            z-index: 999999 !important;
            width: 40px !important;
            height: 40px !important;
            background: #3b82f6 !important;
            border-radius: 10px !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 20px !important;
            font-weight: bold !important;
            color: white !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
            transition: opacity 0.3s ease, transform 0.2s ease, background 0.2s ease !important;
            font-family: system-ui, sans-serif !important;
            opacity: 1 !important;
        }

        /* БЛОК 4.7a: Полупрозрачное состояние */
        #ai-collapse-btn.ai-collapse-transparent {
            opacity: 0.35 !important;
        }

        /* БЛОК 4.7b: При наведении — полная видимость */
        #ai-collapse-btn:hover {
            opacity: 1 !important;
            transform: scale(1.05) !important;
            background: #2563eb !important;
        }

        /* БЛОК 4.1a: Скрытое состояние панели */
        .ai-panel-hidden {
            display: none !important;
        }

        /* БЛОК 4.2: Кнопки действий */
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

        /* БЛОК 4.3: Статус */
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

        /* БЛОК 4.4: Выделение сообщения */
        .ai-selected {
            outline: 1px dashed #3b82f6 !important;
            outline-offset: 2px !important;
            background: rgba(59, 130, 246, 0.05) !important;
            border-radius: 12px !important;
            padding: 2px !important;
            margin: -2px !important;
        }

        /* БЛОК 4.5: Скрытие лишних элементов в Gemini */
        .ai-selected .action-bar,
        .ai-selected [data-testid="action-bar"],
        .ai-selected .feedback-buttons,
        .ai-selected .copy-button,
        .ai-selected .regenerate-button {
            outline: none !important;
            background: transparent !important;
        }

        /* БЛОК 4.6: Светлая тема */
        @media (prefers-color-scheme: light) {
            #ai-collector-panel {
                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
            }
            .ai-status {
                border-top-color: #e2e8f0 !important;
            }
            #ai-collapse-btn {
                background: #2563eb !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
            }
            #ai-collapse-btn.ai-collapse-transparent {
                opacity: 0.4 !important;
            }
            #ai-collapse-btn:hover {
                background: #3b82f6 !important;
                opacity: 1 !important;
            }
        }
    `);

    // БЛОК 5.1: ЭЛЕМЕНТЫ ИНТЕРФЕЙСА
    let selected = null;      // Выделенное сообщение
    let picking = false;      // Режим выбора
    let panel = null;         // Панель управления
    let collapseBtn = null;   // Кнопка-свёртка
    let timer = null;         // Таймер статуса
    let isPanelVisible = true; // Состояние панели (видима/скрыта)

    // БЛОК 5.2: КЛЮЧ ДЛЯ СОХРАНЕНИЯ СОСТОЯНИЯ СВЁРТКИ
    const COLLAPSE_STORAGE_KEY = 'ai_collector_panel_collapsed';

    // БЛОК 5.3: ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ПАНЕЛИ
    function loadPanelState() {
        const saved = GM_getValue(COLLAPSE_STORAGE_KEY, false);
        isPanelVisible = !saved;
        return isPanelVisible;
    }

    // БЛОК 5.4: СОХРАНЕНИЕ СОСТОЯНИЯ ПАНЕЛИ
    function savePanelState(visible) {
        GM_setValue(COLLAPSE_STORAGE_KEY, !visible);
    }

// БЛОК 6.1: ОБНОВЛЕНИЕ СТАТУСА
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

    // БЛОК 6.2: ПРОВЕРКА ОБЛАСТИ КЛИКА (НЕ САЙДБАР)
    function isMainArea(x, y) {
        if (x < CONFIG.sidebarWidth) return false;
        if (y < 50) return false;
        return true;
    }

    // БЛОК 6.3: ОПРЕДЕЛЕНИЕ, ЯВЛЯЕТСЯ ЛИ ЭЛЕМЕНТ ОТВЕТОМ БОТА
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

    // БЛОК 6.4: СОХРАНЕНИЕ ПОСЛЕДНЕГО ВЫДЕЛЕННОГО СООБЩЕНИЯ
    function saveLast() {
        if (selected && selected.innerText) {
            const prefix = currentPlatform.name + '_';
            GM_setValue(prefix + 'lastMsg', selected.innerText.slice(0, 100));
        }
    }

// БЛОК 7.1: ПОИСК КОНТЕЙНЕРА С ОТВЕТОМ БОТА
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

    // БЛОК 7.2: ПРОВЕРКА ВАЛИДНОСТИ СООБЩЕНИЯ (ДЛИНА)
    function isValidMessage(el) {
        if (!el) return false;
        let len = (el.innerText || '').length;
        return len >= CONFIG.minTextLength && len < 100000;
    }

    // БЛОК 7.3: ВЫДЕЛЕНИЕ СООБЩЕНИЯ
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

    // БЛОК 7.4: СБРОС ВЫДЕЛЕНИЯ
    function resetSelection() {
        if (selected) selected.classList.remove('ai-selected');
        selected = null;
        picking = false;
        setStatus(t.resetMsg, '#94a3b8');
        if (panel) panel.style.borderColor = '#3b82f6';
        const prefix = currentPlatform.name + '_';
        GM_setValue(prefix + 'lastMsg', '');
    }

// БЛОК 8.1: ОСНОВНАЯ ФУНКЦИЯ КОПИРОВАНИЯ
    async function copyCode() {
        // БЛОК 8.1a: ПРОВЕРКА НАЛИЧИЯ ВЫДЕЛЕНИЯ
        if (!selected) {
            setStatus(t.selectFirst, '#f59e0b');
            return;
        }

        let blocks = [];
        let seenSignatures = new Set();

        // БЛОК 8.2: СПИСОК СТОП-СЛОВ (ДЛЯ УДАЛЕНИЯ ЗАГОЛОВКОВ)
        const STOP_WORDS = new Set([
            'javascript', 'python', 'java', 'c++', 'c#', 'c', 'go', 'rust',
            'ruby', 'php', 'html', 'css', 'sql', 'typescript', 'swift',
            'kotlin', 'scala', 'perl', 'shell', 'bash', 'powershell',
            'json', 'xml', 'yaml', 'markdown', 'txt', 'text'
        ]);

        // БЛОК 8.3: ОЧИСТКА БЛОКА ОТ ЗАГОЛОВКА (ТОЛЬКО ДЛЯ CHATGPT)
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

        // БЛОК 8.4: ПРОВЕРКА, ЯВЛЯЕТСЯ ЛИ БЛОК ПОЛНОСТЬЮ МУСОРНЫМ
        function isTotallyJunk(text) {
            let trimmed = text.trim().toLowerCase();
            if (STOP_WORDS.has(trimmed)) return true;
            return false;
        }

        // БЛОК 8.5: ПОЛУЧЕНИЕ СИГНАТУРЫ ДЛЯ ДЕДУПЛИКАЦИИ
        function getSignature(text) {
            return text.substring(0, 100).trim().replace(/\s+/g, ' ');
        }

        // БЛОК 8.6: СБОР БЛОКОВ <pre>
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

        // БЛОК 8.7: СБОР БЛОКОВ <code> (ЕСЛИ НЕТ PRE)
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

        // БЛОК 8.8: СБОР MARKDOWN-БЛОКОВ (```)
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

        // БЛОК 8.9: ПРОВЕРКА, ЧТО БЛОКИ НАЙДЕНЫ
        if (blocks.length === 0) {
            setStatus(t.noCode, '#ef4444');
            return;
        }

        // БЛОК 8.10: ФОРМИРОВАНИЕ РЕЗУЛЬТАТА И СТАТУСА
        let result = blocks.join('\n\n');
        const totalChars = result.length;

        let blockWord = blocks.length === 1 ? t.block : t.blocks;
        let statusMsg = `${t.copied}: ${blocks.length} ${blockWord} (${totalChars} ${t.chars})`;

        // БЛОК 8.11: КОПИРОВАНИЕ В БУФЕР
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

    // БЛОК 9.1: ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ ПАНЕЛИ
    function togglePanel() {
        if (isPanelVisible) {
            // Сворачиваем панель
            panel.classList.add('ai-panel-hidden');
            isPanelVisible = false;
            // Кнопка всегда видна, просто меняем стрелку
            collapseBtn.textContent = '▲';
            collapseBtn.title = 'Show panel';
            collapseBtn.classList.add('ai-collapse-transparent');
        } else {
            // Разворачиваем панель
            panel.classList.remove('ai-panel-hidden');
            isPanelVisible = true;
            collapseBtn.textContent = '▼';
            collapseBtn.title = 'Hide panel';
            collapseBtn.classList.add('ai-collapse-transparent');
        }
        savePanelState(isPanelVisible);
    }

    // БЛОК 9.2: СОЗДАНИЕ КНОПКИ-СВЁРТКИ (ВСЕГДА ВИДНА, ВСЕГДА ПОЛУПРОЗРАЧНА)
    function createCollapseButton() {
        let btn = document.createElement('div');
        btn.id = 'ai-collapse-btn';
        btn.textContent = isPanelVisible ? '▼' : '▲';
        btn.title = isPanelVisible ? 'Hide panel' : 'Show panel';
        btn.onclick = togglePanel;

        // Всегда полупрозрачная
        btn.classList.add('ai-collapse-transparent');

        // При наведении мыши убираем прозрачность
        btn.onmouseenter = () => {
            btn.classList.remove('ai-collapse-transparent');
        };

        // Когда мышь уходит — снова делаем полупрозрачной
        btn.onmouseleave = () => {
            btn.classList.add('ai-collapse-transparent');
        };

        document.body.appendChild(btn);
        return btn;
    }

    // БЛОК 9.3: СОЗДАНИЕ ОСНОВНОЙ ПАНЕЛИ
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

    // БЛОК 9.4: ПРИМЕНЕНИЕ СОХРАНЁННОГО СОСТОЯНИЯ ПАНЕЛИ
    function applyPanelState() {
        if (!panel || !collapseBtn) return;
        if (!isPanelVisible) {
            panel.classList.add('ai-panel-hidden');
            collapseBtn.textContent = '▲';
            collapseBtn.title = 'Show panel';
        } else {
            panel.classList.remove('ai-panel-hidden');
            collapseBtn.textContent = '▼';
            collapseBtn.title = 'Hide panel';
        }
        // Кнопка всегда полупрозрачная
        collapseBtn.classList.add('ai-collapse-transparent');
    }

// БЛОК 10.1: ОБРАБОТЧИК КЛИКОВ
    function handleClick(e) {
        // БЛОК 10.1a: РЕЖИМ ВЫБОРА АКТИВЕН
        if (picking) {
            if (e.target.closest && e.target.closest('#ai-collector-panel')) return;
            if (e.target.closest && e.target.closest('#ai-collapse-btn')) return;

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

        // БЛОК 10.1b: СБРОС ПРИ КЛИКЕ ВНЕ ВЫДЕЛЕННОГО СООБЩЕНИЯ
        if (selected && !picking) {
            if (e.target.closest && e.target.closest('#ai-collector-panel')) return;
            if (e.target.closest && e.target.closest('#ai-collapse-btn')) return;
            const clickedOnSelected = selected.contains(e.target);
            if (!clickedOnSelected) {
                resetSelection();
            }
        }
    }

    // БЛОК 10.2: ОБРАБОТЧИК ГОРЯЧИХ КЛАВИШ
    function handleKey(e) {
        // БЛОК 10.2a: CTRL+B (ВЫБОР)
        if (e.ctrlKey && (e.key === 'b' || e.key === 'и')) {
            e.preventDefault();
            picking = true;
            setStatus(t.clickBot, '#f59e0b');
            if (panel) panel.style.borderColor = '#f59e0b';
            return;
        }
        // БЛОК 10.2b: CTRL+C (КОПИРОВАНИЕ, ТОЛЬКО ЕСЛИ ЕСТЬ ВЫДЕЛЕНИЕ)
        if (e.ctrlKey && (e.key === 'c' || e.key === 'с')) {
            if (selected) {
                e.preventDefault();
                copyCode();
            }
            return;
        }
        // БЛОК 10.2c: ESCAPE (СБРОС)
        if (e.key === 'Escape') {
            resetSelection();
            picking = false;
        }
    }

    // БЛОК 10.3: ИНИЦИАЛИЗАЦИЯ
    function init() {
        if (!document.body) { setTimeout(init, 1000); return; }

        // БЛОК 10.3a: ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ПАНЕЛИ
        loadPanelState();

        // БЛОК 10.3b: СОЗДАНИЕ ЭЛЕМЕНТОВ
        panel = createPanel();
        collapseBtn = createCollapseButton();
        applyPanelState();

        // БЛОК 10.3c: ВОССТАНОВЛЕНИЕ ПОСЛЕДНЕГО ВЫДЕЛЕНИЯ
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

    // БЛОК 10.4: РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ И ЗАПУСК
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
