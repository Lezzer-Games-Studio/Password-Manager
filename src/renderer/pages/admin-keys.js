// pages/admin-keys.js
import { 
    collection, 
    addDoc, 
    query, 
    getDocs, 
    orderBy, 
    doc, 
    deleteDoc,
    updateDoc,
    where,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function renderAdminKeys(user, auth, db, onBack) {
    const root = document.getElementById("root");

    function generateLicenseKey() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const segments = [4, 4, 4, 4];
        return segments.map(seg => {
            let segment = '';
            for (let i = 0; i < seg; i++) {
                segment += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return segment;
        }).join('-');
    }

    async function loadKeys() {
        try {
            const keysQuery = query(collection(db, "license_keys"), orderBy("generatedAt", "desc"));
            const keysSnapshot = await getDocs(keysQuery);
            const keys = [];
            keysSnapshot.forEach(docSnap => {
                keys.push({ id: docSnap.id, ...docSnap.data() });
            });
            return keys;
        } catch (error) {
            console.error("Помилка завантаження ключів:", error);
            return [];
        }
    }

    async function renderContent() {
        const keys = await loadKeys();

        // Статистика
        const totalKeys = keys.length;
        const activeKeys = keys.filter(k => k.status === 'active' || (!k.isUsed && !k.usedBy)).length;
        const usedKeys = keys.filter(k => k.isUsed || k.usedBy).length;
        const expiredKeys = keys.filter(k => k.status === 'expired').length;

        root.innerHTML = `
            <div class="auth-container">
                <div class="auth-card" style="max-width: 900px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h1>🔑 Генератор ключів ліцензій</h1>
                            <p style="color: var(--text-dim); margin: 5px 0 0 0; font-size: 14px;">
                                Створюйте ключі для активації PRO підписки
                            </p>
                        </div>
                        <button id="btn_back" style="background: none; color: var(--text-dim); border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                            ← Назад
                        </button>
                    </div>

                    <!-- Статистика -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
                        <div style="background: rgba(59,130,246,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalKeys}</div>
                            <div style="font-size: 12px; color: var(--text-dim);">Всього ключів</div>
                        </div>
                        <div style="background: rgba(16,185,129,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #10b981;">${activeKeys}</div>
                            <div style="font-size: 12px; color: var(--text-dim);">Активних</div>
                        </div>
                        <div style="background: rgba(239,68,68,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${usedKeys}</div>
                            <div style="font-size: 12px; color: var(--text-dim);">Використаних</div>
                        </div>
                        <div style="background: rgba(107,114,128,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${expiredKeys}</div>
                            <div style="font-size: 12px; color: var(--text-dim);">Прострочених</div>
                        </div>
                    </div>

                    <div class="glass-card" style="margin-bottom: 20px;">
                        <h3>➕ Створити новий ключ</h3>
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <input type="number" id="key_days" placeholder="Кількість днів" value="30" style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white;">
                            <select id="key_type" style="padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; cursor: pointer;">
                                <option value="pro">PRO підписка</option>
                                <option value="admin">Адмін права</option>
                                <option value="trial">Пробний період</option>
                            </select>
                            <button id="btn_generate_single" style="padding: 12px 24px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                                🛠️ Згенерувати ключ
                            </button>
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button id="btn_generate_5" style="padding: 10px 20px; background: rgba(234,179,8,0.2); color: #eab308; border: none; border-radius: 6px; cursor: pointer;">
                                5 ключів
                            </button>
                            <button id="btn_generate_10" style="padding: 10px 20px; background: rgba(139,92,246,0.2); color: #8b5cf6; border: none; border-radius: 6px; cursor: pointer;">
                                10 ключів
                            </button>
                        </div>
                    </div>

                    <!-- Фільтри та пошук -->
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <select id="filter_status" style="padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; cursor: pointer;">
                            <option value="all">Усі ключі</option>
                            <option value="active">Тільки активні</option>
                            <option value="used">Тільки використані</option>
                            <option value="expired">Тільки прострочені</option>
                        </select>
                        <input type="text" id="search_key" placeholder="Пошук за ключем або email..." style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white;">
                        <button id="btn_clear_filter" style="padding: 12px 20px; background: rgba(107,114,128,0.2); color: #6b7280; border: none; border-radius: 8px; cursor: pointer;">
                            Очистити
                        </button>
                    </div>

                    <div class="glass-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="margin: 0;">📋 Всі ключі ліцензій (${totalKeys})</h3>
                            <button id="btn_export_keys" style="padding: 8px 16px; background: rgba(16,185,129,0.2); color: #10b981; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                📥 Експорт CSV
                            </button>
                        </div>
                        
                        <div style="max-height: 500px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <thead>
                                    <tr style="background: rgba(255,255,255,0.05);">
                                        <th style="padding: 12px; text-align: left;">Ключ</th>
                                        <th style="padding: 12px; text-align: left;">Тип</th>
                                        <th style="padding: 12px; text-align: left;">Днів</th>
                                        <th style="padding: 12px; text-align: left;">Статус</th>
                                        <th style="padding: 12px; text-align: left;">Користувач</th>
                                        <th style="padding: 12px; text-align: left;">Дата активації</th>
                                        <th style="padding: 12px; text-align: left;">Дії</th>
                                    </tr>
                                </thead>
                                <tbody id="keys_table">
                                    ${keys.map(k => {
                                        const isExpired = k.expiresAt && k.expiresAt < Date.now();
                                        const isUsed = k.isUsed || k.usedBy;
                                        const isActive = !isUsed && !isExpired;
                                        
                                        let status = 'active';
                                        let statusColor = '#10b981';
                                        let statusText = 'Активний';
                                        
                                        if (isUsed) {
                                            status = 'used';
                                            statusColor = '#3b82f6';
                                            statusText = 'Використаний';
                                        } else if (isExpired) {
                                            status = 'expired';
                                            statusColor = '#ef4444';
                                            statusText = 'Прострочений';
                                        }
                                        
                                        const typeColors = {
                                            pro: '#10b981',
                                            admin: '#eab308',
                                            trial: '#8b5cf6'
                                        };
                                        
                                        const typeTexts = {
                                            pro: 'PRO',
                                            admin: 'ADMIN',
                                            trial: 'TRIAL'
                                        };
                                        
                                        return `
                                            <tr class="key_row" data-status="${status}" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <td style="padding: 12px; font-family: monospace; font-weight: bold;">
                                                    ${k.key}
                                                </td>
                                                <td style="padding: 12px;">
                                                    <span style="padding: 4px 8px; background: rgba(${hexToRgb(typeColors[k.type] || '#3b82f6')},0.2); color: ${typeColors[k.type] || '#3b82f6'}; border-radius: 4px; font-size: 12px;">
                                                        ${typeTexts[k.type] || k.type}
                                                    </span>
                                                </td>
                                                <td style="padding: 12px; font-weight: bold; color: ${k.days > 30 ? '#10b981' : (k.days > 7 ? '#eab308' : '#ef4444')}">
                                                    ${k.days}
                                                </td>
                                                <td style="padding: 12px;">
                                                    <span style="padding: 4px 8px; background: rgba(${hexToRgb(statusColor)},0.2); color: ${statusColor}; border-radius: 4px; font-size: 12px;">
                                                        ${statusText}
                                                    </span>
                                                </td>
                                                <td style="padding: 12px; font-size: 13px;">
                                                    ${k.usedBy ? `
                                                        <div>${k.usedBy}</div>
                                                        <div style="font-size: 11px; color: var(--text-dim);">${k.usedByEmail || ''}</div>
                                                    ` : '<em style="color: var(--text-dim);">Не активований</em>'}
                                                </td>
                                                <td style="padding: 12px; font-size: 12px; color: var(--text-dim);">
                                                    ${k.usedAt ? new Date(k.usedAt).toLocaleDateString('uk-UA') : '—'}
                                                </td>
                                                <td style="padding: 12px;">
                                                    <div style="display: flex; gap: 5px;">
                                                        <button class="btn_copy_key" data-key="${k.key}" style="padding: 6px 12px; background: rgba(59,130,246,0.2); color: #3b82f6; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                                            📋
                                                        </button>
                                                        ${!isUsed ? `
                                                            <button class="btn_delete_key" data-id="${k.id}" data-key="${k.key}" style="padding: 6px 12px; background: rgba(239,68,68,0.2); color: #ef4444; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                                                🗑️
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Інструкція -->
                    <div class="glass-card" style="margin-top: 20px; background: rgba(59,130,246,0.05);">
                        <h4>📖 Як працюють ключі:</h4>
                        <ol style="color: var(--text-dim); font-size: 14px; line-height: 1.6; margin: 10px 0 0 0; padding-left: 20px;">
                            <li>Ключ генерується і зберігається в базі даних</li>
                            <li>Користувач вводить ключ на сторінці активації</li>
                            <li>Система перевіряє ключ і активує підписку</li>
                            <li>Ключ позначається як "використаний" з інформацією про користувача</li>
                            <li>PRO підписка активується на вказану кількість днів</li>
                        </ol>
                    </div>
                </div>
            </div>
        `;

        // Генерація одного ключа
        document.getElementById("btn_generate_single").onclick = async () => {
            const days = parseInt(document.getElementById("key_days").value);
            const type = document.getElementById("key_type").value;
            
            if (!days || days < 1) {
                alert("❌ Введіть коректну кількість днів");
                return;
            }

            const key = generateLicenseKey();
            
            try {
                await addDoc(collection(db, "license_keys"), {
                    key: key,
                    days: days,
                    type: type,
                    generatedAt: Date.now(),
                    expiresAt: Date.now() + (days * 24 * 60 * 60 * 1000),
                    status: "active",
                    isUsed: false,
                    generatedBy: user.uid,
                    generatedByEmail: user.email,
                    createdAt: Date.now()
                });

                // Додаємо запис в логи
                await addDoc(collection(db, "logs"), {
                    timestamp: Date.now(),
                    level: "info",
                    source: "Генератор ключів",
                    message: `Згенеровано ключ ${type.toUpperCase()} на ${days} днів`,
                    userEmail: user.email,
                    userId: user.uid,
                    action: "generate_key",
                    key: key
                });

                alert(`✅ Ключ успішно згенеровано!\n\n🔑 ${key}\n\n📅 Термін: ${days} днів\n🎯 Тип: ${type.toUpperCase()}`);
                await renderContent();
                
            } catch (error) {
                console.error("Помилка збереження ключа:", error);
                alert("❌ Помилка збереження ключа: " + error.message);
            }
        };

        // Генерація 5 ключів
        document.getElementById("btn_generate_5").onclick = async () => {
            const days = parseInt(document.getElementById("key_days").value);
            const type = document.getElementById("key_type").value;
            
            if (!days || days < 1) {
                alert("❌ Введіть коректну кількість днів");
                return;
            }

            if (confirm(`Створити 5 ключів типу "${type}" на ${days} днів кожен?`)) {
                try {
                    const generatedKeys = [];
                    
                    for (let i = 0; i < 5; i++) {
                        const key = generateLicenseKey();
                        generatedKeys.push(key);
                        
                        await addDoc(collection(db, "license_keys"), {
                            key: key,
                            days: days,
                            type: type,
                            generatedAt: Date.now(),
                            expiresAt: Date.now() + (days * 24 * 60 * 60 * 1000),
                            status: "active",
                            isUsed: false,
                            generatedBy: user.uid,
                            generatedByEmail: user.email,
                            createdAt: Date.now()
                        });
                    }
                    
                    // Додаємо запис в логи
                    await addDoc(collection(db, "logs"), {
                        timestamp: Date.now(),
                        level: "info",
                        source: "Генератор ключів",
                        message: `Згенеровано 5 ключів типу ${type.toUpperCase()} на ${days} днів`,
                        userEmail: user.email,
                        userId: user.uid,
                        action: "generate_multiple_keys",
                        count: 5
                    });

                    alert(`✅ Успішно згенеровано 5 ключів!\n\nПерелік ключів:\n${generatedKeys.map(k => `🔑 ${k}`).join('\n')}`);
                    await renderContent();
                    
                } catch (error) {
                    console.error("Помилка збереження ключів:", error);
                    alert("❌ Помилка збереження ключів: " + error.message);
                }
            }
        };

        // Генерація 10 ключів
        document.getElementById("btn_generate_10").onclick = async () => {
            const days = parseInt(document.getElementById("key_days").value);
            const type = document.getElementById("key_type").value;
            
            if (!days || days < 1) {
                alert("❌ Введіть коректну кількість днів");
                return;
            }

            if (confirm(`Створити 10 ключів типу "${type}" на ${days} днів кожен?`)) {
                try {
                    const generatedKeys = [];
                    
                    for (let i = 0; i < 10; i++) {
                        const key = generateLicenseKey();
                        generatedKeys.push(key);
                        
                        await addDoc(collection(db, "license_keys"), {
                            key: key,
                            days: days,
                            type: type,
                            generatedAt: Date.now(),
                            expiresAt: Date.now() + (days * 24 * 60 * 60 * 1000),
                            status: "active",
                            isUsed: false,
                            generatedBy: user.uid,
                            generatedByEmail: user.email,
                            createdAt: Date.now()
                        });
                    }
                    
                    // Додаємо запис в логи
                    await addDoc(collection(db, "logs"), {
                        timestamp: Date.now(),
                        level: "info",
                        source: "Генератор ключів",
                        message: `Згенеровано 10 ключів типу ${type.toUpperCase()} на ${days} днів`,
                        userEmail: user.email,
                        userId: user.uid,
                        action: "generate_multiple_keys",
                        count: 10
                    });

                    alert(`✅ Успішно згенеровано 10 ключів!\n\nКлючі збережено в базі даних.`);
                    await renderContent();
                    
                } catch (error) {
                    console.error("Помилка збереження ключів:", error);
                    alert("❌ Помилка збереження ключів: " + error.message);
                }
            }
        };

        // Копіювання ключа
        document.querySelectorAll('.btn_copy_key').forEach(btn => {
            btn.onclick = (e) => {
                const key = e.target.dataset.key;
                navigator.clipboard.writeText(key).then(() => {
                    const originalText = e.target.textContent;
                    e.target.textContent = '✅';
                    e.target.style.background = 'rgba(16,185,129,0.2)';
                    e.target.style.color = '#10b981';
                    
                    setTimeout(() => {
                        e.target.textContent = originalText;
                        e.target.style.background = 'rgba(59,130,246,0.2)';
                        e.target.style.color = '#3b82f6';
                    }, 1500);
                }).catch(() => {
                    alert("Не вдалось скопіювати ключ");
                });
            };
        });

        // Видалення ключа
        document.querySelectorAll('.btn_delete_key').forEach(btn => {
            btn.onclick = async (e) => {
                const keyId = e.target.dataset.id;
                const key = e.target.dataset.key;
                
                if (confirm(`Видалити ключ ${key}?\n\nЦю дію неможливо скасувати!`)) {
                    try {
                        await deleteDoc(doc(db, "license_keys", keyId));
                        
                        // Додаємо запис в логи
                        await addDoc(collection(db, "logs"), {
                            timestamp: Date.now(),
                            level: "warning",
                            source: "Генератор ключів",
                            message: `Ключ ${key} видалено`,
                            userEmail: user.email,
                            userId: user.uid,
                            action: "delete_key"
                        });
                        
                        alert('✅ Ключ видалено!');
                        await renderContent();
                    } catch (error) {
                        console.error("Помилка видалення ключа:", error);
                        alert("❌ Помилка видалення ключа");
                    }
                }
            };
        });

        // Фільтрація ключів
        document.getElementById("filter_status").addEventListener('change', filterKeysTable);
        document.getElementById("search_key").addEventListener('input', filterKeysTable);
        document.getElementById("btn_clear_filter").onclick = () => {
            document.getElementById("filter_status").value = "all";
            document.getElementById("search_key").value = "";
            filterKeysTable();
        };

        // Експорт ключів
        document.getElementById("btn_export_keys").onclick = () => {
            const csv = convertKeysToCSV(keys);
            downloadCSV(csv, `license_keys_${new Date().toISOString().split('T')[0]}.csv`);
            alert("📥 Ключі експортовано у CSV файл!");
        };

        // Повернення назад
        document.getElementById("btn_back").onclick = onBack;
    }

    // Ініціалізуємо відображення
    await renderContent();
}

// ============================================================================
// ДОПОМІЖНІ ФУНКЦІЇ
// ============================================================================

function filterKeysTable() {
    const searchTerm = document.getElementById("search_key").value.toLowerCase();
    const filterStatus = document.getElementById("filter_status").value;
    const rows = document.querySelectorAll('#keys_table .key_row');
    
    rows.forEach(row => {
        const key = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
        const user = row.querySelector('td:nth-child(5)').textContent.toLowerCase();
        const status = row.dataset.status;
        
        const matchesSearch = key.includes(searchTerm) || user.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || status === filterStatus;
        
        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}

function convertKeysToCSV(keys) {
    const headers = ['Ключ', 'Тип', 'Днів', 'Статус', 'Користувач', 'Email користувача', 'Дата створення', 'Дата активації', 'Створив'];
    const rows = keys.map(k => {
        const isExpired = k.expiresAt && k.expiresAt < Date.now();
        const isUsed = k.isUsed || k.usedBy;
        let status = 'Активний';
        if (isUsed) status = 'Використаний';
        if (isExpired) status = 'Прострочений';
        
        return [
            k.key,
            k.type === 'pro' ? 'PRO' : (k.type === 'admin' ? 'ADMIN' : 'TRIAL'),
            k.days,
            status,
            k.usedBy || '',
            k.usedByEmail || '',
            k.generatedAt ? new Date(k.generatedAt).toLocaleDateString('uk-UA') : '',
            k.usedAt ? new Date(k.usedAt).toLocaleDateString('uk-UA') : '',
            k.generatedByEmail || ''
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r},${g},${b}`;
}