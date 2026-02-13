import { 
    collection, getDocs, query, orderBy, doc, updateDoc, getDoc, 
    deleteDoc, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function renderAdmin(user, auth, db, onBack) {
    const root = document.getElementById("root");

    // Перевірка прав
    const superAdminEmails = [
        "lezzergamesstudio@gmail.com",
        "pavloturarnsk5@gmail.com" 
    ];
    
    const isSuperAdmin = superAdminEmails.includes(user.email);
    let isAdminFromDb = false;

    if (!isSuperAdmin) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                isAdminFromDb = userData.role === "admin" || userData.isAdmin === true;
            }
        } catch (e) { console.error(e); }
    }
    
    if (!isSuperAdmin && !isAdminFromDb) {
        root.innerHTML = `
            <div class="loader-container">
                <div style="font-size: 60px; margin-bottom: 20px;">⛔</div>
                <h2 style="margin: 0;">Доступ заборонено</h2>
                <p style="color: var(--text-dim); margin: 10px 0 30px;">Тільки для адміністраторів</p>
                <button onclick="this.click()" id="backBtn" style="max-width: 200px;">Повернутися</button>
            </div>
        `;
        document.getElementById('backBtn').onclick = onBack;
        return;
    }

    // Завантаження
    root.innerHTML = `
        <div class="loader-container">
            <div class="loader-visual">
                <div class="spinner"></div>
                <div class="spinner-inner"></div>
                <div class="loader-logo">🔐</div>
            </div>
            <div class="loader-text">Завантаження панелі...</div>
        </div>
    `;
    
    try {
        const [usersSnap, passwordsSnap, keysSnap, logsSnap, tasksSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "passwords")),
            getDocs(collection(db, "keys")),
            getDocs(query(collection(db, "logs"), orderBy("timestamp", "desc"))),
            getDocs(query(collection(db, "tasks"), orderBy("createdAt", "desc")))
        ]);

        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const passwords = passwordsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const keys = keysSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const proCount = users.filter(u => u.plan === 'pro').length;
        const activeKeys = keys.filter(k => k.isActive && !k.usedBy).length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;

        root.innerHTML = `
            <!-- Sidebar -->
            <div class="sidebar">
                <div style="margin-bottom: 30px;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        🔐 <span>VaultSafe</span>
                    </h2>
                    <p style="color: var(--text-dim); font-size: 12px; margin: 5px 0 0;">Admin Panel</p>
                </div>

                <div style="flex: 1;">
                    <div class="menu-item active" data-tab="stats">
                        <span>📊</span>
                        <span>Статистика</span>
                    </div>
                    <div class="menu-item" data-tab="tasks">
                        <span>✅</span>
                        <span>Задачі</span>
                        ${pendingTasks > 0 ? `<span class="badge-premium" style="margin-left: auto;">${pendingTasks}</span>` : ''}
                    </div>
                    <div class="menu-item" data-tab="users">
                        <span>👥</span>
                        <span>Користувачі</span>
                    </div>
                    <div class="menu-item" data-tab="passwords">
                        <span>🔐</span>
                        <span>Паролі</span>
                    </div>
                    <div class="menu-item" data-tab="keys">
                        <span>🔑</span>
                        <span>Ключі</span>
                    </div>
                    <div class="menu-item" data-tab="logs">
                        <span>📋</span>
                        <span>Логи</span>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--border); padding-top: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                        <div style="width: 40px; height: 40px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${user.email[0].toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 14px; font-weight: 600;">${user.email.split('@')[0]}</div>
                            <div style="font-size: 12px; color: var(--text-dim);">${isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
                        </div>
                    </div>
                    <button id="exitBtn" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">Вийти</button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="main-content">
                <!-- Tab: Статистика -->
                <div class="admin-tab active" id="tab-stats">
                    <h1 style="margin: 0 0 30px; font-size: 28px;">Огляд системи</h1>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div class="glass-card" style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: var(--accent); margin-bottom: 8px;">${users.length}</div>
                            <div style="color: var(--text-dim); font-size: 14px;">Користувачів</div>
                        </div>
                        <div class="glass-card" style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #eab308; margin-bottom: 8px;">${proCount}</div>
                            <div style="color: var(--text-dim); font-size: 14px;">PRO акаунтів</div>
                        </div>
                        <div class="glass-card" style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #10b981; margin-bottom: 8px;">${passwords.length}</div>
                            <div style="color: var(--text-dim); font-size: 14px;">Паролів</div>
                        </div>
                        <div class="glass-card" style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #8b5cf6; margin-bottom: 8px;">${activeKeys}</div>
                            <div style="color: var(--text-dim); font-size: 14px;">Активних ключів</div>
                        </div>
                    </div>

                    <div class="glass-card">
                        <h3 style="margin: 0 0 20px;">⚡ Швидкі дії</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <button id="quickKey" class="buy-btn">🔑 Створити ключ</button>
                            <button id="quickPass" class="buy-btn">🔐 Додати пароль</button>
                            <button id="quickTask" class="buy-btn">✅ Нова задача</button>
                        </div>
                    </div>
                </div>

                <!-- Tab: Задачі -->
                <div class="admin-tab" id="tab-tasks">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">Задачі</h1>
                        <button id="newTaskBtn" class="buy-btn">+ Створити</button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                        ${tasks.length === 0 ? `
                            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                                <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                                <h3 style="color: var(--text-dim);">Немає задач</h3>
                                <p style="color: var(--text-dim); font-size: 14px;">Створіть першу задачу</p>
                            </div>
                        ` : tasks.map(t => `
                            <div class="glass-card" style="border-left: 4px solid ${
                                t.priority === 'high' ? '#ef4444' : 
                                t.priority === 'medium' ? '#eab308' : '#10b981'
                            };">
                                <!-- Header -->
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                    <h3 style="margin: 0; font-size: 16px; flex: 1;">${t.title}</h3>
                                    <button onclick="deleteTask('${t.id}')" style="background: none; border: none; cursor: pointer; padding: 4px; width: auto; color: var(--text-dim);">🗑️</button>
                                </div>

                                <!-- Description -->
                                ${t.description ? `<p style="color: var(--text-dim); font-size: 14px; margin: 0 0 12px;">${t.description}</p>` : ''}

                                <!-- Images -->
                                ${t.images && t.images.length > 0 ? `
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; margin-bottom: 12px;">
                                        ${t.images.slice(0, 4).map(img => `
                                            <div onclick="viewImage('${img.data}')" style="aspect-ratio: 1; border-radius: 6px; overflow: hidden; cursor: pointer; border: 1px solid var(--border);">
                                                <img src="${img.data}" style="width: 100%; height: 100%; object-fit: cover;">
                                            </div>
                                        `).join('')}
                                        ${t.images.length > 4 ? `
                                            <div style="aspect-ratio: 1; border-radius: 6px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 12px; font-weight: bold;">
                                                +${t.images.length - 4}
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}

                                <!-- Tags -->
                                ${t.tags && t.tags.length > 0 ? `
                                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                                        ${t.tags.map(tag => `
                                            <span style="padding: 3px 8px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                                ${tag}
                                            </span>
                                        `).join('')}
                                    </div>
                                ` : ''}

                                <!-- Assignee & Deadline -->
                                ${t.assignedTo || t.deadline ? `
                                    <div style="display: flex; gap: 12px; margin-bottom: 12px; font-size: 12px; color: var(--text-dim);">
                                        ${t.assignedTo ? `
                                            <div style="display: flex; align-items: center; gap: 6px;">
                                                <span>👤</span>
                                                <span>${users.find(u => u.id === t.assignedTo)?.email?.split('@')[0] || 'Unknown'}</span>
                                            </div>
                                        ` : ''}
                                        ${t.deadline ? `
                                            <div style="display: flex; align-items: center; gap: 6px;">
                                                <span>📅</span>
                                                <span>${new Date(t.deadline).toLocaleDateString('uk-UA')}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}

                                <!-- Footer: Status & Priority -->
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 12px; border-top: 1px solid var(--border);">
                                    <select onchange="updateTaskStatus('${t.id}', this.value)" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 12px;">
                                        <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>⏳ Активна</option>
                                        <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>🔄 У роботі</option>
                                        <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>✅ Виконано</option>
                                    </select>
                                    <span style="padding: 4px 10px; background: ${
                                        t.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : 
                                        t.priority === 'medium' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                                    }; color: ${
                                        t.priority === 'high' ? '#ef4444' : 
                                        t.priority === 'medium' ? '#eab308' : '#10b981'
                                    }; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${t.priority || 'medium'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Tab: Користувачі -->
                <div class="admin-tab" id="tab-users">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; gap: 20px;">
                        <h1 style="margin: 0; font-size: 28px;">Користувачі</h1>
                        <input type="search" id="searchUsers" placeholder="🔍 Пошук..." style="width: 300px; margin-bottom: 0;">
                    </div>

                    <div class="glass-card" style="padding: 0; overflow: hidden;">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: rgba(0,0,0,0.2);">
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Email</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">План</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Роль</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Дії</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTableBody">
                                    ${users.map(u => `
                                        <tr style="border-top: 1px solid var(--border);">
                                            <td style="padding: 15px 20px;">
                                                <div style="display: flex; align-items: center; gap: 12px;">
                                                    <div style="width: 32px; height: 32px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">
                                                        ${u.email[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style="font-weight: 500;">${u.email}</div>
                                                        <div style="font-size: 11px; color: var(--text-dim); font-family: monospace;">${u.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding: 15px 20px;">
                                                <select onchange="changePlan('${u.id}', this.value)" style="padding: 6px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: ${u.plan === 'pro' ? '#eab308' : 'white'}; font-size: 13px; font-weight: 500; width: auto; margin: 0;">
                                                    <option value="free" ${u.plan !== 'pro' ? 'selected' : ''}>Free</option>
                                                    <option value="pro" ${u.plan === 'pro' ? 'selected' : ''}>PRO</option>
                                                </select>
                                            </td>
                                            <td style="padding: 15px 20px;">
                                                ${isSuperAdmin ? `
                                                    <button onclick="toggleAdmin('${u.id}', '${u.role || 'user'}')" style="padding: 6px 14px; background: ${u.role === 'admin' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.05)'}; color: ${u.role === 'admin' ? '#eab308' : 'var(--text-dim)'}; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; width: auto;">
                                                        ${u.role === 'admin' ? '⚡ Admin' : '👤 User'}
                                                    </button>
                                                ` : `
                                                    <span style="padding: 6px 14px; background: ${u.role === 'admin' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.05)'}; color: ${u.role === 'admin' ? '#eab308' : 'var(--text-dim)'}; border-radius: 8px; font-size: 12px; font-weight: 600; display: inline-block;">
                                                        ${u.role === 'admin' ? '⚡ Admin' : '👤 User'}
                                                    </span>
                                                `}
                                            </td>
                                            <td style="padding: 15px 20px;">
                                                <button onclick="deleteUser('${u.id}')" style="background: none; border: none; cursor: pointer; padding: 6px; color: var(--text-dim); width: auto;">🗑️</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab: Паролі -->
                <div class="admin-tab" id="tab-passwords">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">База паролів</h1>
                        <button id="newPassBtn" class="buy-btn">+ Додати</button>
                    </div>

                    <div class="glass-card" style="padding: 0; overflow: hidden;">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: rgba(0,0,0,0.2);">
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Сервіс</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Логін</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Власник</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${passwords.map(p => `
                                        <tr style="border-top: 1px solid var(--border);">
                                            <td style="padding: 15px 20px;">
                                                <div style="font-weight: 600;">${p.service || 'No Name'}</div>
                                                <div style="font-size: 11px; color: var(--text-dim);">${p.category || 'General'}</div>
                                            </td>
                                            <td style="padding: 15px 20px; font-family: monospace; color: var(--text-dim);">${p.login || '-'}</td>
                                            <td style="padding: 15px 20px; color: var(--text-dim); font-size: 13px;">
                                                ${p.uid ? (users.find(u => u.id === p.uid)?.email?.split('@')[0] || 'Unknown') : 'Admin'}
                                            </td>
                                            <td style="padding: 15px 20px;">
                                                <button onclick="deletePassword('${p.id}')" style="background: none; border: none; cursor: pointer; padding: 6px; color: var(--text-dim); width: auto;">🗑️</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab: Ключі -->
                <div class="admin-tab" id="tab-keys">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">Ліцензійні ключі</h1>
                        <button id="newKeyBtn" class="buy-btn">✨ Генерувати</button>
                    </div>

                    <div class="glass-card" style="padding: 0; overflow: hidden;">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: rgba(0,0,0,0.2);">
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Ключ</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Тип</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Статус</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${keys.sort((a,b) => b.createdAt - a.createdAt).map(k => `
                                        <tr style="border-top: 1px solid var(--border);">
                                            <td style="padding: 15px 20px;">
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <code style="padding: 4px 8px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 13px; color: ${k.usedBy ? 'var(--text-dim)' : '#eab308'};">${k.key}</code>
                                                    <button onclick="copyKey('${k.key}')" style="background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-dim); width: auto; font-size: 14px;">📋</button>
                                                </div>
                                            </td>
                                            <td style="padding: 15px 20px;">
                                                <span style="padding: 4px 10px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-dim);">
                                                    ${k.type}
                                                </span>
                                            </td>
                                            <td style="padding: 15px 20px;">
                                                <span style="padding: 4px 10px; background: ${k.usedBy ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${k.usedBy ? '#ef4444' : '#10b981'}; border-radius: 6px; font-size: 12px; font-weight: 600;">
                                                    ${k.usedBy ? 'Використано' : 'Активний'}
                                                </span>
                                            </td>
                                            <td style="padding: 15px 20px;">
                                                <button onclick="deleteKey('${k.id}')" style="background: none; border: none; cursor: pointer; padding: 6px; color: var(--text-dim); width: auto;">🗑️</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab: Логи -->
                <div class="admin-tab" id="tab-logs">
                    <h1 style="margin: 0 0 30px; font-size: 28px;">Системні логи</h1>

                    <div class="glass-card" style="padding: 0; overflow: hidden;">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: rgba(0,0,0,0.2);">
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Час</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Повідомлення</th>
                                        <th style="padding: 15px 20px; text-align: left; font-size: 12px; color: var(--text-dim); font-weight: 600; text-transform: uppercase;">Користувач</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logs.slice(0, 50).map(l => `
                                        <tr style="border-top: 1px solid var(--border);">
                                            <td style="padding: 12px 20px; color: var(--text-dim); font-size: 13px;">${new Date(l.timestamp).toLocaleString('uk-UA')}</td>
                                            <td style="padding: 12px 20px; font-size: 14px;">${l.message}</td>
                                            <td style="padding: 12px 20px; color: var(--text-dim); font-size: 13px;">${l.userEmail || 'System'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Модальні вікна -->
            <div id="modalKey" class="modal-overlay">
                <div class="modal-card">
                    <h2 style="margin: 0 0 20px;">Створити ключ</h2>
                    <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px;">Тип:</label>
                    <select id="keyType" style="margin-bottom: 15px;">
                        <option value="pro">PRO Premium</option>
                        <option value="admin">Admin Rights</option>
                    </select>
                    <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px;">Термін (днів):</label>
                    <input type="number" id="keyDays" value="30" min="1" max="365">
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="closeModal('modalKey')" class="secondary">Скасувати</button>
                        <button id="confirmKey">Створити</button>
                    </div>
                </div>
            </div>

            <div id="modalPassword" class="modal-overlay">
                <div class="modal-card">
                    <h2 style="margin: 0 0 20px;">Додати пароль</h2>
                    <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px;">Сервіс:</label>
                    <input type="text" id="passService" placeholder="Facebook, Google...">
                    <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; margin-top: 15px;">Логін:</label>
                    <input type="text" id="passLogin" placeholder="user@example.com">
                    <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; margin-top: 15px;">Пароль:</label>
                    <input type="text" id="passValue">
                    <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; margin-top: 15px;">UID власника (опціонально):</label>
                    <input type="text" id="passUid" value="${user.uid}">
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="closeModal('modalPassword')" class="secondary">Скасувати</button>
                        <button id="confirmPassword">Зберегти</button>
                    </div>
                </div>
            </div>

            <div id="modalTask" class="modal-overlay">
                <div class="modal-card" style="max-width: 600px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                        <h2 style="margin: 0; font-size: 24px;">✨ Створити задачу</h2>
                        <button onclick="closeModal('modalTask')" style="background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 24px; width: auto; padding: 0;">✕</button>
                    </div>

                    <div style="display: grid; gap: 20px;">
                        <!-- Назва -->
                        <div>
                            <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; font-weight: 600;">📝 Назва задачі *</label>
                            <input type="text" id="taskTitle" placeholder="Наприклад: Додати нову функцію..." style="margin-bottom: 0;">
                        </div>

                        <!-- Опис -->
                        <div>
                            <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; font-weight: 600;">📄 Детальний опис</label>
                            <textarea id="taskDesc" placeholder="Опишіть що потрібно зробити..." style="height: 100px; resize: vertical; font-family: inherit; margin-bottom: 0;"></textarea>
                        </div>

                        <!-- Пріоритет та Призначити -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; font-weight: 600;">🎯 Пріоритет</label>
                                <select id="taskPriority" style="margin-bottom: 0;">
                                    <option value="low">🟢 Низький</option>
                                    <option value="medium" selected>🟡 Середній</option>
                                    <option value="high">🔴 Високий</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; font-weight: 600;">👤 Призначити</label>
                                <select id="taskAssignee" style="margin-bottom: 0;">
                                    <option value="">Не призначено</option>
                                    ${users.filter(u => u.role === 'admin' || u.isAdmin).map(u => 
                                        `<option value="${u.id}">${u.email.split('@')[0]}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- Дедлайн -->
                        <div>
                            <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; font-weight: 600;">📅 Дедлайн (опціонально)</label>
                            <input type="date" id="taskDeadline" style="margin-bottom: 0;">
                        </div>

                        <!-- Завантаження зображень -->
                        <div>
                            <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; font-weight: 600;">🖼️ Зображення (опціонально)</label>
                            <div style="position: relative;">
                                <input type="file" id="taskImages" accept="image/*" multiple style="display: none;">
                                <button type="button" onclick="document.getElementById('taskImages').click()" style="width: 100%; padding: 40px 20px; background: rgba(255,255,255,0.03); border: 2px dashed var(--border); border-radius: 12px; color: var(--text-dim); cursor: pointer; transition: all 0.3s;">
                                    <div style="font-size: 32px; margin-bottom: 8px;">📸</div>
                                    <div style="font-size: 14px; font-weight: 500;">Натисніть або перетягніть зображення</div>
                                    <div style="font-size: 12px; margin-top: 4px; opacity: 0.7;">PNG, JPG, GIF до 5MB</div>
                                </button>
                            </div>
                            <div id="imagePreview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 15px;"></div>
                        </div>

                        <!-- Теги -->
                        <div>
                            <label style="display: block; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; font-weight: 600;">🏷️ Теги</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;" id="tagsContainer">
                                <button type="button" class="tag-btn" data-tag="bug">🐛 Bug</button>
                                <button type="button" class="tag-btn" data-tag="feature">✨ Feature</button>
                                <button type="button" class="tag-btn" data-tag="design">🎨 Design</button>
                                <button type="button" class="tag-btn" data-tag="urgent">⚡ Urgent</button>
                                <button type="button" class="tag-btn" data-tag="backend">⚙️ Backend</button>
                                <button type="button" class="tag-btn" data-tag="frontend">💻 Frontend</button>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border);">
                        <button onclick="closeModal('modalTask')" class="secondary" style="flex: 1;">Скасувати</button>
                        <button id="confirmTask" style="flex: 2;">
                            <span style="display: inline-flex; align-items: center; gap: 8px;">
                                <span>✅</span>
                                <span>Створити задачу</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="toast" style="position: fixed; bottom: 30px; right: 30px; background: var(--card-bg); border: 1px solid var(--border); padding: 15px 20px; border-radius: 12px; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 10000;"></div>

            <!-- Image Viewer Modal -->
            <div id="imageViewerModal" class="modal-overlay" onclick="this.classList.remove('active')">
                <div style="position: relative; max-width: 90vw; max-height: 90vh;">
                    <img id="viewerImage" src="" style="max-width: 100%; max-height: 90vh; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <button onclick="event.stopPropagation(); document.getElementById('imageViewerModal').classList.remove('active')" style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; background: rgba(0,0,0,0.8); border: none; border-radius: 50%; color: white; cursor: pointer; font-size: 20px;">✕</button>
                </div>
            </div>

            <style>
                .admin-tab { display: none; }
                .admin-tab.active { display: block; animation: fadeIn 0.3s ease; }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .modal-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.8);
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }

                .modal-overlay.active {
                    display: flex;
                }

                .modal-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 30px;
                    width: 90%;
                    max-width: 450px;
                }

                #toast.show {
                    opacity: 1;
                }

                .tag-btn {
                    padding: 6px 14px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-dim);
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                    width: auto;
                    margin: 0;
                }

                .tag-btn:hover {
                    background: rgba(255,255,255,0.1);
                    border-color: var(--accent);
                    color: var(--text-main);
                }

                .tag-btn.active {
                    background: var(--accent);
                    border-color: var(--accent);
                    color: white;
                }

                .image-preview-item {
                    position: relative;
                    border-radius: 8px;
                    overflow: hidden;
                    aspect-ratio: 1;
                    border: 1px solid var(--border);
                }

                .image-preview-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .image-preview-item .remove-img {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 24px;
                    height: 24px;
                    background: rgba(239, 68, 68, 0.9);
                    border: none;
                    border-radius: 50%;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .image-preview-item:hover .remove-img {
                    opacity: 1;
                }

                /* Mobile */
                @media (max-width: 768px) {
                    .sidebar {
                        position: fixed;
                        left: -280px;
                        top: 0;
                        bottom: 0;
                        z-index: 1000;
                        transition: left 0.3s;
                    }

                    .sidebar.mobile-open {
                        left: 0;
                    }

                    .main-content {
                        padding: 20px;
                    }

                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }

                    table {
                        font-size: 13px;
                    }

                    table th, table td {
                        padding: 10px !important;
                    }
                }
            </style>
        `;

        setupHandlers(user, db, onBack, users, isSuperAdmin);

    } catch (err) {
        root.innerHTML = `
            <div class="loader-container">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <h2>Помилка завантаження</h2>
                <p style="color: var(--text-dim);">${err.message}</p>
            </div>
        `;
    }
}

function setupHandlers(user, db, onBack, users, isSuperAdmin) {
    // Tab switching
    document.querySelectorAll('.menu-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(`tab-${item.dataset.tab}`).classList.add('active');
        };
    });

    document.getElementById('exitBtn').onclick = onBack;

    // Modal handlers
    const openModal = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    document.getElementById('quickKey').onclick = () => openModal('modalKey');
    document.getElementById('newKeyBtn').onclick = () => openModal('modalKey');
    document.getElementById('quickPass').onclick = () => openModal('modalPassword');
    document.getElementById('newPassBtn').onclick = () => openModal('modalPassword');
    document.getElementById('quickTask').onclick = () => openModal('modalTask');
    document.getElementById('newTaskBtn').onclick = () => openModal('modalTask');

    // Create Key
    document.getElementById('confirmKey').onclick = async () => {
        const type = document.getElementById('keyType').value;
        const days = parseInt(document.getElementById('keyDays').value);
        const key = generateKey();
        
        try {
            await addDoc(collection(db, "keys"), {
                key, type, durationDays: days,
                createdAt: Date.now(),
                isActive: true,
                usedBy: null
            });
            await logAction(db, user, `Створено ключ: ${type}`);
            showToast('✅ Ключ створено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    // Add Password
    document.getElementById('confirmPassword').onclick = async () => {
        const service = document.getElementById('passService').value.trim();
        const login = document.getElementById('passLogin').value.trim();
        const password = document.getElementById('passValue').value;
        const uid = document.getElementById('passUid').value.trim();

        if (!service || !password) {
            showToast('⚠️ Заповніть обов\'язкові поля');
            return;
        }

        try {
            await addDoc(collection(db, "passwords"), {
                service, login, password, uid,
                category: 'Other',
                createdAt: Date.now()
            });
            await logAction(db, user, `Додано пароль: ${service}`);
            showToast('✅ Пароль додано');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    // Create Task
    let selectedTags = [];
    let selectedImages = [];

    // Tag selection
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle('active');
            const tag = btn.dataset.tag;
            if (btn.classList.contains('active')) {
                if (!selectedTags.includes(tag)) selectedTags.push(tag);
            } else {
                selectedTags = selectedTags.filter(t => t !== tag);
            }
        };
    });

    // Image upload
    const imageInput = document.getElementById('taskImages');
    const imagePreview = document.getElementById('imagePreview');

    imageInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                showToast('⚠️ Файл завеликий (макс 5MB)');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;
                selectedImages.push({
                    name: file.name,
                    data: imageData,
                    size: file.size
                });

                // Add preview
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.innerHTML = `
                    <img src="${imageData}" alt="${file.name}">
                    <button class="remove-img" onclick="removeImage(${selectedImages.length - 1})">✕</button>
                `;
                imagePreview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    };

    window.removeImage = (index) => {
        selectedImages.splice(index, 1);
        imagePreview.children[index].remove();
    };

    // Drag and drop
    const dropZone = document.querySelector('#modalTask button[type="button"]');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = 'var(--accent)';
            dropZone.style.background = 'rgba(59, 130, 246, 0.1)';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.background = 'rgba(255,255,255,0.03)';
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        imageInput.files = files;
        imageInput.dispatchEvent(new Event('change'));
    });

    document.getElementById('confirmTask').onclick = async () => {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDesc').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const assignedTo = document.getElementById('taskAssignee').value;
        const deadline = document.getElementById('taskDeadline').value;

        if (!title) {
            showToast('⚠️ Введіть назву задачі');
            return;
        }

        try {
            const taskData = {
                title,
                description,
                priority,
                assignedTo: assignedTo || null,
                status: 'pending',
                createdBy: user.uid,
                createdAt: Date.now(),
                tags: selectedTags,
                images: selectedImages,
                deadline: deadline ? new Date(deadline).getTime() : null
            };

            await addDoc(collection(db, "tasks"), taskData);
            await logAction(db, user, `Створено задачу: ${title}`);
            
            // Reset
            selectedTags = [];
            selectedImages = [];
            imagePreview.innerHTML = '';
            document.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
            
            showToast('✅ Задачу створено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            console.error(e);
            showToast('❌ Помилка створення задачі');
        }
    };

    // Search
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            document.querySelectorAll('#usersTableBody tr').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
            });
        };
    }

    // Global functions
    window.changePlan = async (uid, plan) => {
        if (!confirm('Змінити план користувача?')) return;
        try {
            await updateDoc(doc(db, "users", uid), { 
                plan, 
                expiresAt: plan === 'pro' ? Date.now() + 365*24*60*60*1000 : 0 
            });
            await logAction(db, user, `Змінено план на ${plan.toUpperCase()}`);
            showToast('✅ План оновлено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    window.toggleAdmin = async (uid, role) => {
        if (!isSuperAdmin) {
            showToast('⚠️ Тільки Super Admin може призначати адміністраторів');
            return;
        }
        
        const newRole = role === 'admin' ? 'user' : 'admin';
        if (!confirm(`${newRole === 'admin' ? 'Призначити' : 'Зняти'} права адміністратора?`)) return;
        
        try {
            await updateDoc(doc(db, "users", uid), {
                role: newRole,
                isAdmin: newRole === 'admin'
            });
            await logAction(db, user, `${newRole === 'admin' ? 'Призначено' : 'Знято'} адміністратора`);
            showToast('✅ Роль змінено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    window.deleteUser = async (uid) => {
        if (!confirm('Видалити користувача безповоротно?')) return;
        try {
            await deleteDoc(doc(db, "users", uid));
            await logAction(db, user, 'Видалено користувача');
            showToast('✅ Користувача видалено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    window.deletePassword = async (id) => {
        if (!confirm('Видалити цей пароль?')) return;
        try {
            await deleteDoc(doc(db, "passwords", id));
            await logAction(db, user, 'Видалено пароль');
            showToast('✅ Пароль видалено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    window.deleteKey = async (id) => {
        if (!confirm('Видалити цей ключ?')) return;
        try {
            await deleteDoc(doc(db, "keys", id));
            await logAction(db, user, 'Видалено ключ');
            showToast('✅ Ключ видалено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    window.deleteTask = async (id) => {
        if (!confirm('Видалити задачу?')) return;
        try {
            await deleteDoc(doc(db, "tasks", id));
            await logAction(db, user, 'Видалено задачу');
            showToast('✅ Задачу видалено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    window.updateTaskStatus = async (id, status) => {
        try {
            await updateDoc(doc(db, "tasks", id), { status });
            await logAction(db, user, `Оновлено статус задачі: ${status}`);
            showToast('✅ Статус оновлено');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Помилка');
        }
    };

    window.copyKey = (key) => {
        navigator.clipboard.writeText(key);
        showToast('📋 Ключ скопійовано');
    };

    window.viewImage = (imageSrc) => {
        document.getElementById('viewerImage').src = imageSrc;
        document.getElementById('imageViewerModal').classList.add('active');
    };
}

function generateKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "";
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += "-";
        key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
}

async function logAction(db, user, msg) {
    try {
        await addDoc(collection(db, "logs"), {
            timestamp: Date.now(),
            level: "info",
            message: msg,
            userEmail: user.email,
            userId: user.uid
        });
    } catch (e) {
        console.error("Log error:", e);
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}