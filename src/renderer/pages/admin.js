// pages/admin.js - полная версия админ-панели
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    getDoc,
    deleteDoc,
    where,
    addDoc,
    serverTimestamp,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function renderAdmin(user, auth, db, onBack) {
    const root = document.getElementById("root");

    // Список супер-админов (всегда имеют доступ)
    const superAdminEmails = [
        "lezzergamesstudio@gmail.com",
        "pavloturarnsk5@gmail.com"
    ];
    
    const isSuperAdmin = superAdminEmails.includes(user.email);
    
    // Проверяем роль в базе данных для остальных
    let isAdminFromDb = false;
    if (!isSuperAdmin) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                isAdminFromDb = userData.role === "admin" || userData.isAdmin === true;
            }
        } catch (e) { 
            console.error("Помилка перевірки прав:", e);
        }
    }
    
    const hasAccess = isSuperAdmin || isAdminFromDb;
    
    if (!hasAccess) {
        root.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column; background:var(--bg);">
                <div style="text-align:center; max-width:500px;">
                    <div style="font-size:72px; margin-bottom:20px;">⛔</div>
                    <h2 style="color:#ef4444; margin-bottom:15px;">Доступ заборонено</h2>
                    <p style="color:var(--text-dim); margin-bottom:25px;">
                        У вас немає прав для доступу до адмін-панелі.
                        Тільки адміністратори мають доступ до цього розділу.
                    </p>
                    <div style="background:rgba(255,255,255,0.05); border-radius:10px; padding:15px; margin-bottom:25px;">
                        <p style="margin:0; font-size:14px; color:var(--text-dim);">
                            Ваш email: <strong>${user.email}</strong><br>
                            Статус: ${isAdminFromDb ? 'Адмін (за роллю)' : 'Звичайний користувач'}
                        </p>
                    </div>
                    <button id="btn_back" style="padding:12px 30px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">
                        ← Повернутися назад
                    </button>
                </div>
            </div>
        `;
        document.getElementById("btn_back").onclick = onBack;
        return;
    }

    try {
        // Загружаем ВСЕ данные
        console.log("🔄 Завантаження даних адмін-панелі...");
        
        // 1. Пользователи
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers = [];
        usersSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            allUsers.push({
                id: docSnap.id,
                email: data.email || "Немає email",
                uid: data.uid || docSnap.id,
                plan: data.plan || "free",
                role: data.role || "user",
                isAdmin: data.isAdmin || false,
                createdAt: data.createdAt || Date.now(),
                expiresAt: data.expiresAt || 0,
                lastLogin: data.lastLogin || null,
                displayName: data.displayName || "",
                photoURL: data.photoURL || ""
            });
        });
        
        // Сортируем по дате создания
        allUsers.sort((a, b) => b.createdAt - a.createdAt);
        
        // 2. Пароли
        const passwordsSnapshot = await getDocs(collection(db, "passwords"));
        const allPasswords = [];
        passwordsSnapshot.forEach(docSnap => {
            allPasswords.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        // 3. Ключи
        const keysSnapshot = await getDocs(collection(db, "keys"));
        const allKeys = [];
        keysSnapshot.forEach(docSnap => {
            allKeys.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        // 4. Нотатки
        const notesSnapshot = await getDocs(collection(db, "notes"));
        const allNotes = [];
        notesSnapshot.forEach(docSnap => {
            allNotes.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        // 5. Логи системы (если есть)
        let allLogs = [];
        try {
            const logsSnapshot = await getDocs(collection(db, "logs"));
            logsSnapshot.forEach(docSnap => {
                allLogs.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });
            allLogs.sort((a, b) => b.timestamp - a.timestamp);
        } catch (logError) {
            console.log("Колекція logs не знайдена, створюємо пустий масив");
        }
        
        console.log("✅ Дані завантажено:");
        console.log("- Користувачів:", allUsers.length);
        console.log("- Паролів:", allPasswords.length);
        console.log("- Ключів:", allKeys.length);
        console.log("- Нотаток:", allNotes.length);
        console.log("- Логів:", allLogs.length);
        
        // Статистика
        const proUsers = allUsers.filter(u => u.plan === "pro");
        const adminUsers = allUsers.filter(u => u.role === "admin" || u.isAdmin);
        const freeUsers = allUsers.filter(u => u.plan === "free");
        
        const activeKeys = allKeys.filter(k => {
            if (k.isActive === false) return false;
            if (k.expiresAt && k.expiresAt < Date.now()) return false;
            return true;
        });
        
        const usedKeys = allKeys.filter(k => k.usedBy && k.usedAt);
        const expiredKeys = allKeys.filter(k => k.expiresAt && k.expiresAt < Date.now());
        
        // Распределение паролей по пользователям
        const passwordsByUser = {};
        allPasswords.forEach(p => {
            const uid = p.userId;
            if (!passwordsByUser[uid]) passwordsByUser[uid] = 0;
            passwordsByUser[uid]++;
        });
        
        const avgPasswordsPerUser = allUsers.length > 0 
            ? Math.round(allPasswords.length / allUsers.length) 
            : 0;
        
        const usersWithManyPasswords = Object.values(passwordsByUser).filter(count => count > 10).length;
        
        // Новые пользователи за неделю
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const newUsersThisWeek = allUsers.filter(u => u.createdAt >= weekAgo);
        
        // Рендерим админ-панель
        root.innerHTML = `
            <div class="sidebar">
                <h2 style="margin-bottom:40px; color:#eab308;">👑 Адмін</h2>
                <div class="menu-item active" id="tab_dashboard">📊 Дашборд</div>
                <div class="menu-item" id="tab_users">👥 Користувачі (${allUsers.length})</div>
                <div class="menu-item" id="tab_keys">🔑 Ключі (${allKeys.length})</div>
                <div class="menu-item" id="tab_content">🗄️ Контент</div>
                <div class="menu-item" id="tab_analytics">📈 Аналітика</div>
                <div class="menu-item" id="tab_logs">📋 Логи системи</div>
                <div class="menu-item" id="tab_settings">⚙️ Налаштування</div>
                <div style="margin-top:auto;">
                    <div style="padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:10px; font-size:12px;">
                        <div>👑 ${isSuperAdmin ? 'Супер-адмін' : 'Адміністратор'}</div>
                        <div style="font-size:10px; color:var(--text-dim);">${user.email}</div>
                    </div>
                    <button id="btn_back" style="background:none; border:none; color:var(--accent); cursor:pointer; width:100%; text-align:left; padding:10px;">← Назад</button>
                </div>
            </div>

            <div class="main-content">
                <!-- Заголовок -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                    <div>
                        <h1 style="margin:0; color:#eab308;">👑 Адмін панель VaultSafe</h1>
                        <p style="color:var(--text-dim); margin:5px 0 0 0; font-size:14px;">
                            Управління системою | Версія 1.0.0
                        </p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button id="btn_add_log" style="padding:10px 20px; background:rgba(139,92,246,0.2); color:#8b5cf6; border:none; border-radius:8px; cursor:pointer; font-size:14px;">
                            📝 Додати запис
                        </button>
                        <button id="btn_refresh" style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">
                            🔄 Оновити
                        </button>
                    </div>
                </div>

                <!-- Вкладка Дашборд -->
                <div id="dashboard_tab" class="tab-content active">
                    <!-- Карточки статистики -->
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:25px;">
                        <div class="glass-card" style="text-align:center;">
                            <div style="font-size:32px; font-weight:bold; color:#3b82f6;">${allUsers.length}</div>
                            <div style="font-size:12px; color:var(--text-dim);">Користувачів</div>
                            <div style="font-size:10px; color:#10b981; margin-top:5px;">+${newUsersThisWeek.length} за тиждень</div>
                        </div>
                        <div class="glass-card" style="text-align:center;">
                            <div style="font-size:32px; font-weight:bold; color:#eab308;">${proUsers.length}</div>
                            <div style="font-size:12px; color:var(--text-dim);">PRO підписок</div>
                            <div style="font-size:10px; color:#10b981;">${Math.round((proUsers.length / allUsers.length) * 100) || 0}%</div>
                        </div>
                        <div class="glass-card" style="text-align:center;">
                            <div style="font-size:32px; font-weight:bold; color:#8b5cf6;">${allPasswords.length}</div>
                            <div style="font-size:12px; color:var(--text-dim);">Збережених паролів</div>
                            <div style="font-size:10px; color:#10b981;">~${avgPasswordsPerUser} на юзера</div>
                        </div>
                        <div class="glass-card" style="text-align:center;">
                            <div style="font-size:32px; font-weight:bold; color:#10b981;">${activeKeys.length}</div>
                            <div style="font-size:12px; color:var(--text-dim);">Активних ключів</div>
                            <div style="font-size:10px; color:#ef4444;">${expiredKeys.length} прострочені</div>
                        </div>
                    </div>

                    <!-- Швидкі дії -->
                    <div class="glass-card" style="margin-bottom:20px;">
                        <h3 style="margin-top:0; color:#eab308;">⚡ Швидкі дії</h3>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-top:15px;">
                            <button id="btn_add_admin_quick" style="padding:15px; background:#eab308; color:black; border:none; border-radius:8px; cursor:pointer; text-align:left;">
                                <div style="font-size:24px; margin-bottom:5px;">👑</div>
                                <div style="font-weight:bold;">Додати адміна</div>
                                <div style="font-size:12px; opacity:0.8;">За email</div>
                            </button>
                            
                            <button id="btn_generate_key_quick" style="padding:15px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer; text-align:left;">
                                <div style="font-size:24px; margin-bottom:5px;">🔑</div>
                                <div style="font-weight:bold;">Новий ключ</div>
                                <div style="font-size:12px; opacity:0.8;">30 днів</div>
                            </button>
                            
                            <button id="btn_view_logs_quick" style="padding:15px; background:rgba(16,185,129,0.2); color:#10b981; border:none; border-radius:8px; cursor:pointer; text-align:left;">
                                <div style="font-size:24px; margin-bottom:5px;">📋</div>
                                <div style="font-weight:bold;">Логи системи</div>
                                <div style="font-size:12px; opacity:0.8;">Переглянути</div>
                            </button>
                            
                            <button id="btn_export_data_quick" style="padding:15px; background:rgba(139,92,246,0.2); color:#8b5cf6; border:none; border-radius:8px; cursor:pointer; text-align:left;">
                                <div style="font-size:24px; margin-bottom:5px;">📥</div>
                                <div style="font-weight:bold;">Експорт даних</div>
                                <div style="font-size:12px; opacity:0.8;">JSON формат</div>
                            </button>
                        </div>
                    </div>

                    <!-- Два колонки -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                        <!-- Останні користувачі -->
                        <div class="glass-card">
                            <h3 style="margin-top:0;">👥 Останні користувачі</h3>
                            <div style="margin-top:15px; max-height:300px; overflow-y:auto;">
                                ${allUsers.slice(0, 6).map((u, index) => {
                                    const isCurrentUser = u.email === user.email;
                                    const isAdminUser = u.role === "admin" || u.isAdmin;
                                    const isProUser = u.plan === "pro";
                                    
                                    return `
                                        <div style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:12px;">
                                            <div style="width:36px; height:36px; background:${isCurrentUser ? '#eab308' : (isAdminUser ? '#8b5cf6' : (isProUser ? '#10b981' : 'var(--accent)'))}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">
                                                ${u.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div style="flex:1;">
                                                <div style="font-weight:bold; font-size:13px; display:flex; align-items:center; gap:8px;">
                                                    ${u.email.length > 20 ? u.email.substring(0, 20) + '...' : u.email}
                                                    ${isCurrentUser ? '<span style="font-size:10px; background:#eab308; color:black; padding:2px 6px; border-radius:10px;">Ви</span>' : ''}
                                                    ${isAdminUser ? '<span style="font-size:10px; background:#8b5cf6; color:white; padding:2px 6px; border-radius:10px;">A</span>' : ''}
                                                    ${isProUser ? '<span style="font-size:10px; background:#10b981; color:white; padding:2px 6px; border-radius:10px;">P</span>' : ''}
                                                </div>
                                                <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">
                                                    ${new Date(u.createdAt).toLocaleDateString('uk-UA')}
                                                </div>
                                            </div>
                                            <button class="btn_quick_action" data-uid="${u.id}" data-email="${u.email}" style="padding:6px 12px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
                                                Дії
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${allUsers.length > 6 ? `
                                <div style="text-align:center; margin-top:15px;">
                                    <button id="btn_show_all_users" style="padding:8px 16px; background:rgba(255,255,255,0.05); color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
                                        Показати всіх (${allUsers.length})
                                    </button>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Активність системи -->
                        <div class="glass-card">
                            <h3 style="margin-top:0;">📈 Активність системи</h3>
                            <div style="margin-top:15px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <span style="font-size:14px;">Користувачів PRO/FREE:</span>
                                    <span style="font-weight:bold; color:#10b981;">${proUsers.length}/${freeUsers.length}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <span style="font-size:14px;">Адміністраторів:</span>
                                    <span style="font-weight:bold; color:#eab308;">${adminUsers.length}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <span style="font-size:14px;">Активних ключів:</span>
                                    <span style="font-weight:bold; color:#3b82f6;">${activeKeys.length}/${allKeys.length}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <span style="font-size:14px;">Нотаток:</span>
                                    <span style="font-weight:bold; color:#8b5cf6;">${allNotes.length}</span>
                                </div>
                                
                                <div style="margin-top:20px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                                    <h4 style="margin:0 0 10px 0; font-size:16px;">📊 Розподіл користувачів:</h4>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="flex:1; height:20px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                                            <div style="width:${(proUsers.length / allUsers.length) * 100 || 0}%; height:100%; background:#10b981;"></div>
                                        </div>
                                        <span style="font-size:12px; white-space:nowrap;">${proUsers.length} PRO</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:12px; color:var(--text-dim);">
                                        <span>Free: ${freeUsers.length}</span>
                                        <span>PRO: ${proUsers.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Вкладка Користувачі -->
                <div id="users_tab" class="tab-content" style="display:none;">
                    <div class="glass-card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h3 style="margin:0;">👥 Управління користувачами (${allUsers.length})</h3>
                            <div style="display:flex; gap:10px;">
                                <button id="btn_export_users" style="padding:8px 16px; background:rgba(16,185,129,0.2); color:#10b981; border:none; border-radius:6px; cursor:pointer; font-size:14px;">
                                    📥 Експорт CSV
                                </button>
                                <button id="btn_add_user_manual" style="padding:8px 16px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px;">
                                    ➕ Додати користувача
                                </button>
                            </div>
                        </div>
                        
                        <!-- Фільтри та пошук -->
                        <div style="display:flex; gap:10px; margin-bottom:20px;">
                            <input type="text" id="search_user" placeholder="Пошук за email..." style="flex:2; padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white;">
                            <select id="filter_plan" style="padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white; cursor:pointer;">
                                <option value="all">Усі плани</option>
                                <option value="pro">Тільки PRO</option>
                                <option value="free">Тільки FREE</option>
                            </select>
                            <select id="filter_role" style="padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white; cursor:pointer;">
                                <option value="all">Усі ролі</option>
                                <option value="admin">Тільки адміни</option>
                                <option value="user">Тільки користувачі</option>
                            </select>
                            <button id="btn_search_users" style="padding:12px 24px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer;">
                                🔍 Пошук
                            </button>
                        </div>

                        <!-- Таблиця користувачів -->
                        <div style="max-height:500px; overflow-y:auto;">
                            <table style="width:100%; border-collapse:collapse; font-size:14px;">
                                <thead>
                                    <tr style="background:rgba(255,255,255,0.05);">
                                        <th style="padding:12px; text-align:left; width:40px;">#</th>
                                        <th style="padding:12px; text-align:left;">Email</th>
                                        <th style="padding:12px; text-align:left;">UID</th>
                                        <th style="padding:12px; text-align:left;">План</th>
                                        <th style="padding:12px; text-align:left;">Роль</th>
                                        <th style="padding:12px; text-align:left;">Дата реєстрації</th>
                                        <th style="padding:12px; text-align:left;">Дії</th>
                                    </tr>
                                </thead>
                                <tbody id="users_table">
                                    ${allUsers.map((u, index) => {
                                        const isCurrentUser = u.email === user.email;
                                        const isAdminUser = u.role === "admin" || u.isAdmin;
                                        const userEmail = u.email || 'Email відсутній';
                                        const userPlan = u.plan || 'free';
                                        const userRole = u.role || 'user';
                                        const userDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('uk-UA') : 'Дата відсутня';
                                        
                                        return `
                                            <tr class="user_row" data-plan="${userPlan}" data-role="${isAdminUser ? 'admin' : 'user'}" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                                <td style="padding:12px; color:var(--text-dim);">${index + 1}</td>
                                                <td style="padding:12px; font-weight:bold;">
                                                    ${userEmail}
                                                    ${isCurrentUser ? '<span style="font-size:11px; color:#eab308; margin-left:5px;">(ви)</span>' : ''}
                                                </td>
                                                <td style="padding:12px; font-size:11px; color:var(--text-dim); font-family:monospace;">
                                                    ${u.id.substring(0, 8)}...
                                                </td>
                                                <td style="padding:12px;">
                                                    <select class="user_plan" data-uid="${u.id}" style="padding:6px 12px; border-radius:4px; background:${userPlan === 'pro' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}; color:${userPlan === 'pro' ? '#10b981' : '#3b82f6'}; border:none; cursor:pointer;">
                                                        <option value="free" ${userPlan === 'free' ? 'selected' : ''}>FREE</option>
                                                        <option value="pro" ${userPlan === 'pro' ? 'selected' : ''}>PRO</option>
                                                    </select>
                                                </td>
                                                <td style="padding:12px;">
                                                    <select class="user_role" data-uid="${u.id}" data-current="${isAdminUser ? 'admin' : 'user'}" style="padding:6px 12px; border-radius:4px; background:${isAdminUser ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.1)'}; color:${isAdminUser ? '#eab308' : 'white'}; border:none; cursor:pointer;">
                                                        <option value="user" ${!isAdminUser ? 'selected' : ''}>Користувач</option>
                                                        <option value="admin" ${isAdminUser ? 'selected' : ''}>Адміністратор</option>
                                                    </select>
                                                </td>
                                                <td style="padding:12px; font-size:12px; color:var(--text-dim);">
                                                    ${userDate}
                                                </td>
                                                <td style="padding:12px;">
                                                    <div style="display:flex; gap:5px;">
                                                        <button class="btn_view_user" data-uid="${u.id}" data-email="${userEmail}" style="padding:6px 12px; background:rgba(59,130,246,0.2); color:#3b82f6; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                                                            👁️
                                                        </button>
                                                        ${!isCurrentUser ? `
                                                            <button class="btn_delete_user" data-uid="${u.id}" data-email="${userEmail}" style="padding:6px 12px; background:rgba(239,68,68,0.2); color:#ef4444; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
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
                </div>

                <!-- Вкладка Ключі -->
                <div id="keys_tab" class="tab-content" style="display:none;">
                    <div class="glass-card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h3 style="margin:0;">🔑 Управління ключами (${allKeys.length})</h3>
                            <div style="display:flex; gap:10px;">
                                <button id="btn_create_key" style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">
                                    ➕ Створити ключ
                                </button>
                            </div>
                        </div>
                        
                        <!-- Статистика ключів -->
                        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:20px;">
                            <div style="background:rgba(16,185,129,0.1); padding:15px; border-radius:8px; text-align:center;">
                                <div style="font-size:24px; font-weight:bold; color:#10b981;">${activeKeys.length}</div>
                                <div style="font-size:12px; color:var(--text-dim);">Активні</div>
                            </div>
                            <div style="background:rgba(59,130,246,0.1); padding:15px; border-radius:8px; text-align:center;">
                                <div style="font-size:24px; font-weight:bold; color:#3b82f6;">${usedKeys.length}</div>
                                <div style="font-size:12px; color:var(--text-dim);">Використані</div>
                            </div>
                            <div style="background:rgba(239,68,68,0.1); padding:15px; border-radius:8px; text-align:center;">
                                <div style="font-size:24px; font-weight:bold; color:#ef4444;">${expiredKeys.length}</div>
                                <div style="font-size:12px; color:var(--text-dim);">Прострочені</div>
                            </div>
                            <div style="background:rgba(255,255,255,0.1); padding:15px; border-radius:8px; text-align:center;">
                                <div style="font-size:24px; font-weight:bold; color:white;">${allKeys.length}</div>
                                <div style="font-size:12px; color:var(--text-dim);">Всього</div>
                            </div>
                        </div>
                        
                        <!-- Фільтри -->
                        <div style="display:flex; gap:10px; margin-bottom:20px;">
                            <select id="filter_key_status" style="padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white; cursor:pointer;">
                                <option value="all">Усі ключі</option>
                                <option value="active">Активні</option>
                                <option value="used">Використані</option>
                                <option value="expired">Прострочені</option>
                            </select>
                            <input type="text" id="search_key" placeholder="Пошук за ключем або email..." style="flex:1; padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white;">
                            <button id="btn_search_keys" style="padding:12px 24px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer;">
                                🔍 Пошук
                            </button>
                        </div>

                        <!-- Таблиця ключів -->
                        <div style="max-height:500px; overflow-y:auto;">
                            <table style="width:100%; border-collapse:collapse; font-size:14px;">
                                <thead>
                                    <tr style="background:rgba(255,255,255,0.05);">
                                        <th style="padding:12px; text-align:left;">Ключ</th>
                                        <th style="padding:12px; text-align:left;">Тип</th>
                                        <th style="padding:12px; text-align:left;">Термін дії</th>
                                        <th style="padding:12px; text-align:left;">Користувач</th>
                                        <th style="padding:12px; text-align:left;">Статус</th>
                                        <th style="padding:12px; text-align:left;">Дії</th>
                                    </tr>
                                </thead>
                                <tbody id="keys_table">
                                    ${allKeys.map(k => {
                                        const isExpired = k.expiresAt && k.expiresAt < Date.now();
                                        const isUsed = k.usedBy && k.usedAt;
                                        const isActive = k.isActive !== false && !isExpired && !isUsed;
                                        
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
                                        } else if (k.isActive === false) {
                                            status = 'inactive';
                                            statusColor = '#6b7280';
                                            statusText = 'Неактивний';
                                        }
                                        
                                        return `
                                            <tr class="key_row" data-status="${status}" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                                <td style="padding:12px; font-family:monospace; font-weight:bold;">
                                                    ${k.key || 'Немає ключа'}
                                                </td>
                                                <td style="padding:12px;">
                                                    <span style="padding:4px 8px; background:${k.type === 'pro' ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.2)'}; color:${k.type === 'pro' ? '#10b981' : '#eab308'}; border-radius:4px; font-size:12px;">
                                                        ${k.type === 'pro' ? 'PRO' : (k.type === 'admin' ? 'ADMIN' : 'STANDARD')}
                                                    </span>
                                                </td>
                                                <td style="padding:12px; font-size:12px;">
                                                    ${k.expiresAt ? `до ${new Date(k.expiresAt).toLocaleDateString('uk-UA')}` : 'Без терміну'}
                                                </td>
                                                <td style="padding:12px;">
                                                    ${k.usedBy ? k.usedBy : '<em style="color:var(--text-dim);">Не використаний</em>'}
                                                </td>
                                                <td style="padding:12px;">
                                                    <span style="padding:4px 8px; background:rgba(${hexToRgb(statusColor)},0.2); color:${statusColor}; border-radius:4px; font-size:12px;">
                                                        ${statusText}
                                                    </span>
                                                </td>
                                                <td style="padding:12px;">
                                                    <div style="display:flex; gap:5px;">
                                                        <button class="btn_copy_key" data-key="${k.key}" style="padding:6px 12px; background:rgba(59,130,246,0.2); color:#3b82f6; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                                                            📋
                                                        </button>
                                                        <button class="btn_deactivate_key" data-id="${k.id}" data-key="${k.key}" style="padding:6px 12px; background:rgba(239,68,68,0.2); color:#ef4444; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                                                            🚫
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Вкладка Контент -->
                <div id="content_tab" class="tab-content" style="display:none;">
                    <div class="glass-card">
                        <h3 style="margin-top:0;">🗄️ Управління контентом</h3>
                        
                        <!-- Статистика контенту -->
                        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:20px; margin:20px 0;">
                            <div style="background:rgba(59,130,246,0.1); padding:20px; border-radius:10px;">
                                <div style="display:flex; align-items:center; gap:15px;">
                                    <div style="font-size:36px;">🔐</div>
                                    <div>
                                        <div style="font-size:32px; font-weight:bold;">${allPasswords.length}</div>
                                        <div style="color:var(--text-dim);">Збережених паролів</div>
                                        <div style="font-size:12px; color:#3b82f6; margin-top:5px;">
                                            ~${avgPasswordsPerUser} на користувача
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="background:rgba(16,185,129,0.1); padding:20px; border-radius:10px;">
                                <div style="display:flex; align-items:center; gap:15px;">
                                    <div style="font-size:36px;">📝</div>
                                    <div>
                                        <div style="font-size:32px; font-weight:bold;">${allNotes.length}</div>
                                        <div style="color:var(--text-dim);">Створених нотаток</div>
                                        <div style="font-size:12px; color:#10b981; margin-top:5px;">
                                            ${Math.round(allNotes.length / allUsers.length) || 0} на користувача
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Останні паролі -->
                        <div style="margin-top:30px;">
                            <h4>🔐 Останні додані паролі</h4>
                            <div style="max-height:300px; overflow-y:auto; margin-top:15px;">
                                ${allPasswords.slice(0, 10).map(p => `
                                    <div style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <div>
                                                <div style="font-weight:bold;">${p.website || 'Без назви'}</div>
                                                <div style="color:var(--text-dim); font-size:12px; margin-top:3px;">
                                                    Логін: ${p.login || 'немає'} • 
                                                    ${new Date(p.createdAt || Date.now()).toLocaleDateString('uk-UA')}
                                                </div>
                                            </div>
                                            <div style="font-size:11px; color:var(--text-dim);">
                                                Власник: ${allUsers.find(u => u.id === p.userId)?.email?.substring(0, 15) || 'Невідомий'}...
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${allPasswords.length > 10 ? `
                                <div style="text-align:center; margin-top:15px;">
                                    <button class="btn_view_more" data-type="passwords" style="padding:8px 16px; background:rgba(255,255,255,0.05); color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
                                        Показати всі паролі (${allPasswords.length})
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Останні нотатки -->
                        <div style="margin-top:30px;">
                            <h4>📝 Останні нотатки</h4>
                            <div style="max-height:300px; overflow-y:auto; margin-top:15px;">
                                ${allNotes.slice(0, 10).map(n => `
                                    <div style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <div style="display:flex; justify-content:space-between; align-items:start;">
                                            <div style="flex:1;">
                                                <div>${n.text.length > 100 ? n.text.substring(0, 100) + '...' : n.text}</div>
                                                <div style="color:var(--text-dim); font-size:12px; margin-top:3px;">
                                                    ${new Date(n.createdAt || Date.now()).toLocaleDateString('uk-UA')}
                                                </div>
                                            </div>
                                            <div style="font-size:11px; color:var(--text-dim); margin-left:15px;">
                                                Власник: ${allUsers.find(u => u.id === n.userId)?.email?.substring(0, 15) || 'Невідомий'}...
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${allNotes.length > 10 ? `
                                <div style="text-align:center; margin-top:15px;">
                                    <button class="btn_view_more" data-type="notes" style="padding:8px 16px; background:rgba(255,255,255,0.05); color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
                                        Показати всі нотатки (${allNotes.length})
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Вкладка Аналітика -->
                <div id="analytics_tab" class="tab-content" style="display:none;">
                    <div class="glass-card">
                        <h3 style="margin-top:0;">📈 Аналітика системи</h3>
                        
                        <!-- Основна статистика -->
                        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:20px; margin-top:20px;">
                            <div>
                                <h4>📊 Користувачі</h4>
                                <div style="margin-top:15px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>Загальна кількість:</span>
                                        <span style="font-weight:bold; color:#3b82f6;">${allUsers.length}</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>PRO користувачі:</span>
                                        <span style="font-weight:bold; color:#10b981;">${proUsers.length} (${Math.round((proUsers.length / allUsers.length) * 100) || 0}%)</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>FREE користувачі:</span>
                                        <span style="font-weight:bold; color:#3b82f6;">${freeUsers.length} (${Math.round((freeUsers.length / allUsers.length) * 100) || 0}%)</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>Адміністратори:</span>
                                        <span style="font-weight:bold; color:#eab308;">${adminUsers.length} (${Math.round((adminUsers.length / allUsers.length) * 100) || 0}%)</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between;">
                                        <span>Нові за тиждень:</span>
                                        <span style="font-weight:bold; color:#8b5cf6;">${newUsersThisWeek.length}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h4>📈 Активність</h4>
                                <div style="margin-top:15px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>Всього паролів:</span>
                                        <span style="font-weight:bold; color:#3b82f6;">${allPasswords.length}</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>Всього нотаток:</span>
                                        <span style="font-weight:bold; color:#10b981;">${allNotes.length}</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>Середня к-ть паролів:</span>
                                        <span style="font-weight:bold; color:#8b5cf6;">${avgPasswordsPerUser} на юзера</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                        <span>Середня к-ть нотаток:</span>
                                        <span style="font-weight:bold; color:#8b5cf6;">${Math.round(allNotes.length / allUsers.length) || 0} на юзера</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between;">
                                        <span>Активних ключів:</span>
                                        <span style="font-weight:bold; color:#eab308;">${activeKeys.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Графіки (псевдо) -->
                        <div style="margin-top:30px;">
                            <h4>📊 Візуалізація даних</h4>
                            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:20px; margin-top:15px;">
                                <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:20px;">
                                    <h5 style="margin:0 0 15px 0; font-size:14px;">Розподіл користувачів</h5>
                                    <div style="height:150px; display:flex; align-items:end; gap:10px; padding:10px 0;">
                                        <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                                            <div style="width:30px; height:${(proUsers.length / allUsers.length) * 100 || 10}px; background:#10b981; border-radius:4px;"></div>
                                            <div style="font-size:11px; margin-top:5px; color:var(--text-dim);">PRO</div>
                                        </div>
                                        <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                                            <div style="width:30px; height:${(freeUsers.length / allUsers.length) * 100 || 10}px; background:#3b82f6; border-radius:4px;"></div>
                                            <div style="font-size:11px; margin-top:5px; color:var(--text-dim);">FREE</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:20px;">
                                    <h5 style="margin:0 0 15px 0; font-size:14px;">Статус ключів</h5>
                                    <div style="height:150px; display:flex; align-items:end; gap:10px; padding:10px 0;">
                                        <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                                            <div style="width:30px; height:${(activeKeys.length / allKeys.length) * 100 || 10}px; background:#10b981; border-radius:4px;"></div>
                                            <div style="font-size:11px; margin-top:5px; color:var(--text-dim);">Активні</div>
                                        </div>
                                        <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                                            <div style="width:30px; height:${(usedKeys.length / allKeys.length) * 100 || 10}px; background:#3b82f6; border-radius:4px;"></div>
                                            <div style="font-size:11px; margin-top:5px; color:var(--text-dim);">Використані</div>
                                        </div>
                                        <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                                            <div style="width:30px; height:${(expiredKeys.length / allKeys.length) * 100 || 10}px; background:#ef4444; border-radius:4px;"></div>
                                            <div style="font-size:11px; margin-top:5px; color:var(--text-dim);">Прострочені</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Топ користувачі -->
                        <div style="margin-top:30px;">
                            <h4>🏆 Топ користувачі</h4>
                            <div style="margin-top:15px;">
                                ${allUsers.slice(0, 5).map((u, index) => {
                                    const userPasswordCount = passwordsByUser[u.id] || 0;
                                    const userNoteCount = allNotes.filter(n => n.userId === u.id).length;
                                    
                                    return `
                                        <div style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:15px;">
                                            <div style="width:30px; height:30px; background:${index === 0 ? '#eab308' : (index === 1 ? '#cbd5e1' : (index === 2 ? '#d97706' : 'var(--accent)'))}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">
                                                ${index + 1}
                                            </div>
                                            <div style="flex:1;">
                                                <div style="font-weight:bold; font-size:14px;">${u.email}</div>
                                                <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">
                                                    Паролів: ${userPasswordCount} • Нотаток: ${userNoteCount} • ${u.plan === 'pro' ? '👑 PRO' : 'FREE'}
                                                </div>
                                            </div>
                                            <div style="font-size:12px; color:#eab308; font-weight:bold;">
                                                ${userPasswordCount + userNoteCount} очок
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Вкладка Логи системи -->
                <div id="logs_tab" class="tab-content" style="display:none;">
                    <div class="glass-card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h3 style="margin:0;">📋 Логи системи (${allLogs.length})</h3>
                            <div style="display:flex; gap:10px;">
                                <button id="btn_clear_logs" style="padding:8px 16px; background:rgba(239,68,68,0.2); color:#ef4444; border:none; border-radius:6px; cursor:pointer; font-size:14px;">
                                    🗑️ Очистити логи
                                </button>
                                <button id="btn_add_test_log" style="padding:8px 16px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px;">
                                    📝 Тестовий запис
                                </button>
                            </div>
                        </div>
                        
                        <!-- Фільтри логів -->
                        <div style="display:flex; gap:10px; margin-bottom:20px;">
                            <select id="filter_log_level" style="padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white; cursor:pointer;">
                                <option value="all">Усі рівні</option>
                                <option value="info">Інфо</option>
                                <option value="warning">Попередження</option>
                                <option value="error">Помилка</option>
                                <option value="success">Успіх</option>
                            </select>
                            <input type="text" id="search_log" placeholder="Пошук по логах..." style="flex:1; padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white;">
                            <button id="btn_search_logs" style="padding:12px 24px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer;">
                                🔍 Пошук
                            </button>
                        </div>

                        <!-- Таблиця логів -->
                        <div style="max-height:500px; overflow-y:auto;">
                            ${allLogs.length > 0 ? `
                                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                                    <thead>
                                        <tr style="background:rgba(255,255,255,0.05);">
                                            <th style="padding:12px; text-align:left;">Час</th>
                                            <th style="padding:12px; text-align:left;">Рівень</th>
                                            <th style="padding:12px; text-align:left;">Джерело</th>
                                            <th style="padding:12px; text-align:left;">Повідомлення</th>
                                            <th style="padding:12px; text-align:left;">Користувач</th>
                                        </tr>
                                    </thead>
                                    <tbody id="logs_table">
                                        ${allLogs.slice(0, 50).map(log => {
                                            const levelColors = {
                                                info: '#3b82f6',
                                                warning: '#eab308',
                                                error: '#ef4444',
                                                success: '#10b981'
                                            };
                                            
                                            return `
                                                <tr class="log_row" data-level="${log.level || 'info'}" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                                    <td style="padding:12px; font-size:12px; color:var(--text-dim);">
                                                        ${log.timestamp ? new Date(log.timestamp).toLocaleString('uk-UA') : 'Невідомо'}
                                                    </td>
                                                    <td style="padding:12px;">
                                                        <span style="padding:4px 8px; background:rgba(${hexToRgb(levelColors[log.level] || '#3b82f6')},0.2); color:${levelColors[log.level] || '#3b82f6'}; border-radius:4px; font-size:12px;">
                                                            ${log.level || 'info'}
                                                        </span>
                                                    </td>
                                                    <td style="padding:12px;">
                                                        ${log.source || 'Система'}
                                                    </td>
                                                    <td style="padding:12px;">
                                                        ${log.message || 'Немає повідомлення'}
                                                    </td>
                                                    <td style="padding:12px; font-size:12px; color:var(--text-dim);">
                                                        ${log.userEmail || log.userId || 'Система'}
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            ` : `
                                <div style="text-align:center; padding:40px; color:var(--text-dim);">
                                    <div style="font-size:48px; margin-bottom:15px;">📋</div>
                                    <h3>Логи відсутні</h3>
                                    <p>У системі ще немає записів у логах.</p>
                                    <button id="btn_create_logs" style="margin-top:15px; padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer;">
                                        Створити тестові логи
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Вкладка Налаштування -->
                <div id="settings_tab" class="tab-content" style="display:none;">
                    <div class="glass-card">
                        <h3 style="margin-top:0;">⚙️ Налаштування адмін-панелі</h3>
                        
                        <!-- Супер-адміни -->
                        <div style="margin-top:20px;">
                            <h4>👑 Супер-адміністратори</h4>
                            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; margin:10px 0;">
                                <div style="font-family:monospace; font-size:13px; line-height:1.8;">
                                    ${superAdminEmails.map(email => `
                                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                                            <div style="width:8px; height:8px; background:#10b981; border-radius:50%;"></div>
                                            <span>${email}</span>
                                            ${email === user.email ? '<span style="font-size:11px; background:#eab308; color:black; padding:2px 8px; border-radius:10px;">Ви</span>' : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; margin-top:15px;">
                                <input type="email" id="new_superadmin_email" placeholder="Новий email супер-адміна" style="flex:1; padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white;">
                                <button id="btn_add_superadmin" style="padding:10px 20px; background:#eab308; color:black; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                                    Додати
                                </button>
                            </div>
                        </div>
                        
                        <!-- Налаштування системи -->
                        <div style="margin-top:30px;">
                            <h4>⚙️ Налаштування системи</h4>
                            <div style="margin-top:15px;">
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px;">
                                    <div>
                                        <div style="font-weight:bold;">Режим обслуговування</div>
                                        <div style="font-size:12px; color:var(--text-dim);">Призупинити доступ для звичайних користувачів</div>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" id="toggle_maintenance">
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px;">
                                    <div>
                                        <div style="font-weight:bold;">Автоматичне резервне копіювання</div>
                                        <div style="font-size:12px; color:var(--text-dim);">Створювати бекап щодня</div>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" id="toggle_auto_backup" checked>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px;">
                                    <div>
                                        <div style="font-weight:bold;">Логування всіх дій</div>
                                        <div style="font-size:12px; color:var(--text-dim);">Записувати всі дії в системі</div>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" id="toggle_logging" checked>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Небезпечні дії -->
                        <div style="margin-top:40px; padding-top:20px; border-top:2px solid rgba(239,68,68,0.3);">
                            <h4 style="color:#ef4444;">⚠️ Небезпечні дії</h4>
                            <p style="color:var(--text-dim); font-size:14px; margin-bottom:20px;">
                                Ці дії можуть призвести до втрати даних. Виконуйте обережно!
                            </p>
                            
                            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:15px;">
                                <button id="btn_backup_now" style="padding:15px; background:rgba(16,185,129,0.2); color:#10b981; border:none; border-radius:8px; cursor:pointer; text-align:left;">
                                    <div style="font-size:24px; margin-bottom:5px;">💾</div>
                                    <div style="font-weight:bold;">Створити бекап</div>
                                    <div style="font-size:12px; opacity:0.8;">Експорт всіх даних</div>
                                </button>
                                
                                <button id="btn_reset_stats" style="padding:15px; background:rgba(234,179,8,0.2); color:#eab308; border:none; border-radius:8px; cursor:pointer; text-align:left;">
                                    <div style="font-size:24px; margin-bottom:5px;">📊</div>
                                    <div style="font-weight:bold;">Скинути статистику</div>
                                    <div style="font-size:12px; opacity:0.8;">Обнулити всі лічильники</div>
                                </button>
                                
                                <button id="btn_cleanup_data" style="padding:15px; background:rgba(239,68,68,0.2); color:#ef4444; border:none; border-radius:8px; cursor:pointer; text-align:left;">
                                    <div style="font-size:24px; margin-bottom:5px;">🗑️</div>
                                    <div style="font-weight:bold;">Очистити дані</div>
                                    <div style="font-size:12px; opacity:0.8;">Видалити старі записи</div>
                                </button>
                                
                                <button id="btn_reset_system" style="padding:15px; background:rgba(239,68,68,0.3); color:#ef4444; border:1px solid rgba(239,68,68,0.5); border-radius:8px; cursor:pointer; text-align:left;">
                                    <div style="font-size:24px; margin-bottom:5px;">🔥</div>
                                    <div style="font-weight:bold;">Скинути систему</div>
                                    <div style="font-size:12px; opacity:0.8;">Повне скидання</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .glass-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border-radius: 15px;
                    padding: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .tab-content {
                    display: none;
                    animation: fadeIn 0.3s ease-in-out;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                .menu-item {
                    padding: 12px 15px;
                    margin: 5px 0;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 14px;
                }
                
                .menu-item:hover {
                    background: rgba(255,255,255,0.05);
                }
                
                .menu-item.active {
                    background: var(--accent);
                    font-weight: bold;
                }
                
                button {
                    transition: all 0.2s;
                }
                
                button:hover {
                    transform: translateY(-2px);
                }
                
                select, input {
                    cursor: pointer;
                }
                
                select:focus, input:focus {
                    outline: none;
                    border-color: var(--accent);
                }
                
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(255,255,255,0.1);
                    transition: .4s;
                    border-radius: 24px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .slider {
                    background-color: var(--accent);
                }
                
                input:checked + .slider:before {
                    transform: translateX(26px);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            </style>
        `;
        
        // Инициализация всех обработчиков
        initializeAdminHandlers(user, auth, db, onBack, allUsers, allKeys, allPasswords, allNotes, allLogs);
        
    } catch (error) {
        console.error("❌ Помилка завантаження адмін-панелі:", error);
        root.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column; background:var(--bg);">
                <div style="text-align:center; max-width:600px;">
                    <div style="font-size:72px; margin-bottom:20px;">❌</div>
                    <h2 style="color:#ef4444; margin-bottom:15px;">Помилка завантаження</h2>
                    <p style="color:var(--text-dim); margin-bottom:25px;">
                        Не вдалося завантажити адмін-панель. Деталі помилки:
                    </p>
                    <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:15px; margin-bottom:25px;">
                        <code style="color:#ef4444; font-size:14px;">${error.message}</code>
                    </div>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button id="btn_back_error" style="padding:12px 30px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">
                            ← Повернутися
                        </button>
                        <button onclick="location.reload()" style="padding:12px 30px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">
                            🔄 Спробувати знову
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById("btn_back_error").onclick = onBack;
    }
}

// ============================================================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С АДМИН-ПАНЕЛЬЮ
// ============================================================================

async function initializeAdminHandlers(user, auth, db, onBack, allUsers, allKeys, allPasswords, allNotes, allLogs) {
    
    // 1. Навигация по вкладкам
    document.querySelectorAll('.menu-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            item.classList.add('active');
            const tabId = item.id.replace('tab_', '') + '_tab';
            document.getElementById(tabId).classList.add('active');
        };
    });

    // 2. Кнопка "Оновити"
    document.getElementById("btn_refresh").onclick = () => {
        renderAdmin(user, auth, db, onBack);
    };

    // 3. Кнопка "Додати запис" (в логи)
    document.getElementById("btn_add_log").onclick = async () => {
        const message = prompt("Введіть повідомлення для логу:");
        if (message) {
            try {
                await addDoc(collection(db, "logs"), {
                    timestamp: Date.now(),
                    level: "info",
                    source: "Адмін-панель",
                    message: message,
                    userEmail: user.email,
                    userId: user.uid,
                    action: "manual_log"
                });
                alert("✅ Запис додано до логів!");
                renderAdmin(user, auth, db, onBack);
            } catch (error) {
                console.error("Помилка додавання запису:", error);
                alert("❌ Помилка: " + error.message);
            }
        }
    };

    // 4. Кнопка "Експорт даних"
    if (document.getElementById("btn_export_data_quick")) {
        document.getElementById("btn_export_data_quick").onclick = exportAllData;
    }

    // 5. Кнопка "Додати адміна" (быстрая)
    document.getElementById("btn_add_admin_quick").onclick = async () => {
        const email = prompt("Введіть email користувача, якого хочете зробити адміністратором:");
        if (email && email.includes('@')) {
            const userToAdmin = allUsers.find(u => u.email === email);
            if (userToAdmin) {
                if (confirm(`Надати права адміністратора користувачу ${email}?`)) {
                    try {
                        await updateDoc(doc(db, "users", userToAdmin.id), {
                            role: "admin",
                            isAdmin: true,
                            updatedAt: Date.now(),
                            updatedBy: user.email
                        });
                        
                        // Добавляем запись в логи
                        await addDoc(collection(db, "logs"), {
                            timestamp: Date.now(),
                            level: "info",
                            source: "Адмін-панель",
                            message: `Користувачу ${email} надано права адміністратора`,
                            userEmail: user.email,
                            userId: user.uid,
                            targetUser: email
                        });
                        
                        alert("✅ Користувачу надано права адміністратора!");
                        renderAdmin(user, auth, db, onBack);
                    } catch (error) {
                        console.error("Помилка:", error);
                        alert("❌ Помилка: " + error.message);
                    }
                }
            } else {
                alert("❌ Користувача з таким email не знайдено");
            }
        }
    };

    // 6. Кнопка "Новий ключ" (быстрая)
    document.getElementById("btn_generate_key_quick").onclick = async () => {
        try {
            const { renderAdminKeys } = await import('./admin-keys.js');
            renderAdminKeys(user, auth, db, 
                () => renderAdmin(user, auth, db, onBack)
            );
        } catch (error) {
            console.error("Помилка завантаження генератора ключів:", error);
            alert("❌ Помилка: " + error.message);
        }
    };

    // 7. Кнопка "Логи системи" (быстрая)
    document.getElementById("btn_view_logs_quick").onclick = () => {
        document.getElementById('tab_logs').click();
    };

    // 8. Кнопка "Показати всіх користувачів"
    if (document.getElementById("btn_show_all_users")) {
        document.getElementById("btn_show_all_users").onclick = () => {
            document.getElementById('tab_users').click();
        };
    }

    // 9. Поиск пользователей
    if (document.getElementById("btn_search_users")) {
        document.getElementById("btn_search_users").onclick = filterUsersTable;
        document.getElementById("search_user").addEventListener('input', filterUsersTable);
        document.getElementById("filter_plan").addEventListener('change', filterUsersTable);
        document.getElementById("filter_role").addEventListener('change', filterUsersTable);
    }

    // 10. Поиск ключей
    if (document.getElementById("btn_search_keys")) {
        document.getElementById("btn_search_keys").onclick = filterKeysTable;
        document.getElementById("search_key").addEventListener('input', filterKeysTable);
        document.getElementById("filter_key_status").addEventListener('change', filterKeysTable);
    }

    // 11. Поиск логов
    if (document.getElementById("btn_search_logs")) {
        document.getElementById("btn_search_logs").onclick = filterLogsTable;
        document.getElementById("search_log").addEventListener('input', filterLogsTable);
        document.getElementById("filter_log_level").addEventListener('change', filterLogsTable);
    }

    // 12. Изменение плана пользователя
    document.querySelectorAll('.user_plan').forEach(select => {
        select.onclick = (e) => e.stopPropagation();
        
        select.onchange = async (e) => {
            const userId = e.target.dataset.uid;
            const newPlan = e.target.value;
            const userEmail = allUsers.find(u => u.id === userId)?.email || 'Невідомий';
            
            if (confirm(`Змінити план користувача ${userEmail} на ${newPlan.toUpperCase()}?`)) {
                try {
                    const expiresAt = newPlan === 'pro' ? Date.now() + (365 * 24 * 60 * 60 * 1000) : 0;
                    
                    await updateDoc(doc(db, "users", userId), {
                        plan: newPlan,
                        expiresAt: expiresAt,
                        updatedAt: Date.now(),
                        updatedBy: user.email
                    });
                    
                    // Логируем действие
                    await addDoc(collection(db, "logs"), {
                        timestamp: Date.now(),
                        level: "info",
                        source: "Адмін-панель",
                        message: `План користувача ${userEmail} змінено на ${newPlan.toUpperCase()}`,
                        userEmail: user.email,
                        userId: user.uid,
                        targetUser: userEmail,
                        action: "change_plan"
                    });
                    
                    alert("✅ План користувача оновлено!");
                    renderAdmin(user, auth, db, onBack);
                } catch (error) {
                    console.error("Помилка оновлення плану:", error);
                    alert("❌ Помилка: " + error.message);
                    e.target.value = e.target.dataset.originalValue;
                }
            } else {
                e.target.value = e.target.dataset.originalValue;
            }
        };
        
        // Сохраняем оригинальное значение
        document.querySelectorAll('.user_plan').forEach(s => {
            s.dataset.originalValue = s.value;
        });
    });

    // 13. Изменение роли пользователя
    document.querySelectorAll('.user_role').forEach(select => {
        select.onclick = (e) => e.stopPropagation();
        
        select.onchange = async (e) => {
            const userId = e.target.dataset.uid;
            const newRole = e.target.value;
            const currentRole = e.target.dataset.current;
            const userEmail = allUsers.find(u => u.id === userId)?.email || 'Невідомий';
            
            if (currentRole !== newRole) {
                if (confirm(`${newRole === 'admin' ? 'Надати' : 'Забрати'} права адміністратора у користувача ${userEmail}?`)) {
                    try {
                        await updateDoc(doc(db, "users", userId), {
                            role: newRole,
                            isAdmin: newRole === 'admin',
                            updatedAt: Date.now(),
                            updatedBy: user.email
                        });
                        
                        // Логируем действие
                        await addDoc(collection(db, "logs"), {
                            timestamp: Date.now(),
                            level: "info",
                            source: "Адмін-панель",
                            message: `Користувачу ${userEmail} ${newRole === 'admin' ? 'надано' : 'забрано'} права адміністратора`,
                            userEmail: user.email,
                            userId: user.uid,
                            targetUser: userEmail,
                            action: "change_role"
                        });
                        
                        alert(`✅ Права адміністратора ${newRole === 'admin' ? 'надано' : 'забрано'}!`);
                        renderAdmin(user, auth, db, onBack);
                    } catch (error) {
                        console.error("Помилка зміни ролі:", error);
                        alert("❌ Помилка: " + error.message);
                        e.target.value = currentRole;
                    }
                } else {
                    e.target.value = currentRole;
                }
            }
        };
    });

    // 14. Просмотр информации о пользователе
    document.querySelectorAll('.btn_view_user').forEach(btn => {
        btn.onclick = async (e) => {
            const userId = e.target.dataset.uid;
            const userEmail = e.target.dataset.email;
            const userData = allUsers.find(u => u.id === userId);
            
            if (userData) {
                // Подсчитываем статистику пользователя
                const userPasswords = allPasswords.filter(p => p.userId === userId).length;
                const userNotes = allNotes.filter(n => n.userId === userId).length;
                const userKeys = allKeys.filter(k => k.usedBy === userEmail).length;
                
                const modalContent = `
                    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;">
                        <div style="background:var(--bg-light); padding:30px; border-radius:15px; width:500px; max-width:90%; max-height:80vh; overflow-y:auto;">
                            <h3 style="margin-top:0; color:#eab308;">👤 Детальна інформація</h3>
                            
                            <div style="margin:20px 0;">
                                <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
                                    <div style="width:60px; height:60px; background:${userData.plan === 'pro' ? '#10b981' : (userData.role === 'admin' ? '#eab308' : 'var(--accent)')}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:24px;">
                                        ${userData.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 style="margin:0;">${userData.email}</h4>
                                        <div style="display:flex; gap:10px; margin-top:5px;">
                                            <span style="padding:4px 8px; background:${userData.plan === 'pro' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}; color:${userData.plan === 'pro' ? '#10b981' : '#3b82f6'}; border-radius:4px; font-size:12px;">
                                                ${userData.plan === 'pro' ? 'PRO' : 'FREE'}
                                            </span>
                                            ${userData.role === 'admin' || userData.isAdmin ? 
                                                '<span style="padding:4px 8px; background:rgba(234,179,8,0.2); color:#eab308; border-radius:4px; font-size:12px;">Адмін</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin:20px 0;">
                                    <div style="text-align:center; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                                        <div style="font-size:24px; font-weight:bold; color:#3b82f6;">${userPasswords}</div>
                                        <div style="font-size:12px; color:var(--text-dim);">Паролів</div>
                                    </div>
                                    <div style="text-align:center; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                                        <div style="font-size:24px; font-weight:bold; color:#10b981;">${userNotes}</div>
                                        <div style="font-size:12px; color:var(--text-dim);">Нотаток</div>
                                    </div>
                                    <div style="text-align:center; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                                        <div style="font-size:24px; font-weight:bold; color:#eab308;">${userKeys}</div>
                                        <div style="font-size:12px; color:var(--text-dim);">Ключів</div>
                                    </div>
                                </div>
                                
                                <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:15px; margin-top:15px;">
                                    <p><strong>UID:</strong> <code style="font-size:12px;">${userData.id}</code></p>
                                    <p><strong>Дата реєстрації:</strong> ${new Date(userData.createdAt).toLocaleString('uk-UA')}</p>
                                    ${userData.lastLogin ? `<p><strong>Останній вхід:</strong> ${new Date(userData.lastLogin).toLocaleString('uk-UA')}</p>` : ''}
                                    ${userData.expiresAt && userData.plan === 'pro' ? `<p><strong>PRO діє до:</strong> ${new Date(userData.expiresAt).toLocaleDateString('uk-UA')}</p>` : ''}
                                    ${userData.displayName ? `<p><strong>Ім'я:</strong> ${userData.displayName}</p>` : ''}
                                </div>
                            </div>
                            
                            <button id="btn_close_modal" style="padding:12px 30px; background:var(--accent); color:white; border:none; border-radius:8px; cursor:pointer; width:100%;">
                                Закрити
                            </button>
                        </div>
                    </div>
                `;
                
                const modal = document.createElement('div');
                modal.innerHTML = modalContent;
                document.body.appendChild(modal);
                
                document.getElementById('btn_close_modal').onclick = () => {
                    document.body.removeChild(modal);
                };
            }
        };
    });

    // 15. Удаление пользователя
    document.querySelectorAll('.btn_delete_user').forEach(btn => {
        btn.onclick = async (e) => {
            const userId = e.target.dataset.uid;
            const userEmail = e.target.dataset.email;
            
            if (confirm(`Видалити акаунт ${userEmail}?\n\nЦю дію неможливо скасувати!`)) {
                const confirmation = prompt(`Для підтвердження введіть "DELETE ${userEmail}":`);
                if (confirmation === `DELETE ${userEmail}`) {
                    try {
                        // Удаляем пользователя из базы данных
                        await deleteDoc(doc(db, "users", userId));
                        
                        // Удаляем пароли пользователя
                        const userPasswords = allPasswords.filter(p => p.userId === userId);
                        for (const password of userPasswords) {
                            await deleteDoc(doc(db, "passwords", password.id));
                        }
                        
                        // Удаляем нотатки пользователя
                        const userNotes = allNotes.filter(n => n.userId === userId);
                        for (const note of userNotes) {
                            await deleteDoc(doc(db, "notes", note.id));
                        }
                        
                        // Логируем действие
                        await addDoc(collection(db, "logs"), {
                            timestamp: Date.now(),
                            level: "warning",
                            source: "Адмін-панель",
                            message: `Користувача ${userEmail} видалено з системи`,
                            userEmail: user.email,
                            userId: user.uid,
                            targetUser: userEmail,
                            action: "delete_user"
                        });
                        
                        alert(`✅ Користувача ${userEmail} видалено!`);
                        renderAdmin(user, auth, db, onBack);
                    } catch (error) {
                        console.error("Помилка видалення користувача:", error);
                        alert("❌ Помилка: " + error.message);
                    }
                } else {
                    alert("❌ Видалення скасовано");
                }
            }
        };
    });

    // 16. Копирование ключа
    document.querySelectorAll('.btn_copy_key').forEach(btn => {
        btn.onclick = (e) => {
            const key = e.target.dataset.key;
            if (key) {
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
                });
            }
        };
    });

    // 17. Деактивация ключа
    document.querySelectorAll('.btn_deactivate_key').forEach(btn => {
        btn.onclick = async (e) => {
            const keyId = e.target.dataset.id;
            const key = e.target.dataset.key;
            
            if (confirm(`Деактивувати ключ ${key}?`)) {
                try {
                    await updateDoc(doc(db, "keys", keyId), {
                        isActive: false,
                        deactivatedAt: Date.now(),
                        deactivatedBy: user.email
                    });
                    
                    // Логируем действие
                    await addDoc(collection(db, "logs"), {
                        timestamp: Date.now(),
                        level: "info",
                        source: "Адмін-панель",
                        message: `Ключ ${key.substring(0, 8)}... деактивовано`,
                        userEmail: user.email,
                        userId: user.uid,
                        action: "deactivate_key"
                    });
                    
                    alert('✅ Ключ деактивовано!');
                    renderAdmin(user, auth, db, onBack);
                } catch (error) {
                    console.error("Помилка деактивації ключа:", error);
                    alert("❌ Помилка: " + error.message);
                }
            }
        };
    });

    // 18. Создание ключа
    if (document.getElementById("btn_create_key")) {
        document.getElementById("btn_create_key").onclick = async () => {
            try {
                const { renderAdminKeys } = await import('./admin-keys.js');
                renderAdminKeys(user, auth, db, 
                    () => renderAdmin(user, auth, db, onBack)
                );
            } catch (error) {
                console.error("Помилка:", error);
                alert("❌ Помилка завантаження генератора ключів");
            }
        };
    }

    // 19. Экспорт пользователей в CSV
    if (document.getElementById("btn_export_users")) {
        document.getElementById("btn_export_users").onclick = () => {
            const csv = convertUsersToCSV(allUsers);
            downloadCSV(csv, `vaultsafe_users_${new Date().toISOString().split('T')[0]}.csv`);
            alert("📥 Список користувачів експортовано!");
        };
    }

    // 20. Очистка логов
    if (document.getElementById("btn_clear_logs")) {
        document.getElementById("btn_clear_logs").onclick = async () => {
            if (confirm("Очистити всі логи? Цю дію неможливо скасувати!")) {
                alert("🗑️ Функція очищення логів у розробці");
            }
        };
    }

    // 21. Добавление тестового лога
    if (document.getElementById("btn_add_test_log")) {
        document.getElementById("btn_add_test_log").onclick = async () => {
            try {
                await addDoc(collection(db, "logs"), {
                    timestamp: Date.now(),
                    level: "info",
                    source: "Тест",
                    message: "Це тестовий запис у логах системи",
                    userEmail: user.email,
                    userId: user.uid,
                    action: "test_log"
                });
                alert("✅ Тестовий запис додано!");
                renderAdmin(user, auth, db, onBack);
            } catch (error) {
                console.error("Помилка:", error);
                alert("❌ Помилка: " + error.message);
            }
        };
    }

    // 22. Создание логов (если их нет)
    if (document.getElementById("btn_create_logs")) {
        document.getElementById("btn_create_logs").onclick = async () => {
            const testLogs = [
                { level: "info", message: "Система запущена", source: "Система" },
                { level: "success", message: "Адмін-панель завантажена", source: "Адмін-панель" },
                { level: "warning", message: "Перевірте налаштування безпеки", source: "Безпека" },
                { level: "info", message: "Новий користувач зареєстрований", source: "Реєстрація" },
                { level: "error", message: "Помилка підключення до бази даних", source: "База даних" }
            ];
            
            try {
                for (const log of testLogs) {
                    await addDoc(collection(db, "logs"), {
                        timestamp: Date.now() - Math.random() * 86400000,
                        level: log.level,
                        source: log.source,
                        message: log.message,
                        userEmail: user.email
                    });
                }
                alert("✅ Тестові логи створено!");
                renderAdmin(user, auth, db, onBack);
            } catch (error) {
                console.error("Помилка:", error);
                alert("❌ Помилка: " + error.message);
            }
        };
    }

    // 23. Добавление супер-админа
    if (document.getElementById("btn_add_superadmin")) {
        document.getElementById("btn_add_superadmin").onclick = () => {
            const newEmail = document.getElementById("new_superadmin_email").value;
            if (newEmail && newEmail.includes('@')) {
                alert(`✅ Email ${newEmail} додано до списку супер-адміністраторів\n\nУвага: для постійного збереження змініть код файлу admin.js`);
                document.getElementById("new_superadmin_email").value = '';
            } else {
                alert("❌ Введіть коректний email");
            }
        };
    }

    // 24. Создание бекапа
    if (document.getElementById("btn_backup_now")) {
        document.getElementById("btn_backup_now").onclick = exportAllData;
    }

    // 25. Сброс статистики
    if (document.getElementById("btn_reset_stats")) {
        document.getElementById("btn_reset_stats").onclick = () => {
            if (confirm("Скинути всю статистику системи?")) {
                alert("📊 Функція скидання статистики у розробці");
            }
        };
    }

    // 26. Очистка данных
    if (document.getElementById("btn_cleanup_data")) {
        document.getElementById("btn_cleanup_data").onclick = () => {
            if (confirm("Видалити старі дані (старше 1 року)?")) {
                alert("🗑️ Функція очищення даних у розробці");
            }
        };
    }

    // 27. Сброс системы
    if (document.getElementById("btn_reset_system")) {
        document.getElementById("btn_reset_system").onclick = () => {
            if (confirm("⚠️ Ця дія видалить ВСІ дані з системи!\n\nВведіть 'RESET SYSTEM' для підтвердження:")) {
                const input = prompt("Введіть 'RESET SYSTEM' для підтвердження:");
                if (input === 'RESET SYSTEM') {
                    alert("🔥 Функція скидання системи у розробці");
                } else {
                    alert("❌ Скидання скасовано");
                }
            }
        };
    }

    // 28. Кнопки "Показать больше" для контента
    document.querySelectorAll('.btn_view_more').forEach(btn => {
        btn.onclick = (e) => {
            const type = e.target.dataset.type;
            if (type === 'passwords') {
                alert(`🔐 Показати всі ${allPasswords.length} паролів\n\nФункція повного перегляду у розробці`);
            } else if (type === 'notes') {
                alert(`📝 Показати всі ${allNotes.length} нотаток\n\nФункція повного перегляду у розробці`);
            }
        };
    });

    // 29. Возврат назад
    document.getElementById("btn_back").onclick = onBack;

    // 30. Функция экспорта всех данных
    async function exportAllData() {
        const exportData = {
            exportDate: new Date().toISOString(),
            exportedBy: user.email,
            statistics: {
                totalUsers: allUsers.length,
                proUsers: allUsers.filter(u => u.plan === 'pro').length,
                adminUsers: allUsers.filter(u => u.role === 'admin' || u.isAdmin).length,
                totalPasswords: allPasswords.length,
                totalNotes: allNotes.length,
                totalKeys: allKeys.length,
                activeKeys: allKeys.filter(k => k.isActive !== false && (!k.expiresAt || k.expiresAt > Date.now()) && !k.usedBy).length
            },
            users: allUsers.map(u => ({
                email: u.email,
                uid: u.id,
                plan: u.plan,
                role: u.role,
                isAdmin: u.isAdmin,
                createdAt: new Date(u.createdAt).toISOString(),
                expiresAt: u.expiresAt ? new Date(u.expiresAt).toISOString() : null,
                lastLogin: u.lastLogin ? new Date(u.lastLogin).toISOString() : null
            })),
            keys: allKeys.map(k => ({
                key: k.key,
                type: k.type,
                expiresAt: k.expiresAt ? new Date(k.expiresAt).toISOString() : null,
                usedBy: k.usedBy,
                usedAt: k.usedAt ? new Date(k.usedAt).toISOString() : null,
                isActive: k.isActive,
                createdAt: k.createdAt ? new Date(k.createdAt).toISOString() : null
            }))
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vaultsafe_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        alert('📥 Дані експортовано у JSON файл!');
    }
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

function filterUsersTable() {
    const searchTerm = document.getElementById("search_user").value.toLowerCase();
    const filterPlan = document.getElementById("filter_plan").value;
    const filterRole = document.getElementById("filter_role").value;
    const rows = document.querySelectorAll('#users_table .user_row');
    
    rows.forEach(row => {
        const email = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        const plan = row.dataset.plan;
        const role = row.dataset.role;
        
        const matchesSearch = email.includes(searchTerm);
        const matchesPlan = filterPlan === 'all' || plan === filterPlan;
        const matchesRole = filterRole === 'all' || role === filterRole;
        
        row.style.display = (matchesSearch && matchesPlan && matchesRole) ? '' : 'none';
    });
}

function filterKeysTable() {
    const searchTerm = document.getElementById("search_key").value.toLowerCase();
    const filterStatus = document.getElementById("filter_key_status").value;
    const rows = document.querySelectorAll('#keys_table .key_row');
    
    rows.forEach(row => {
        const key = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
        const user = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
        const status = row.dataset.status;
        
        const matchesSearch = key.includes(searchTerm) || user.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || status === filterStatus;
        
        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}

function filterLogsTable() {
    const searchTerm = document.getElementById("search_log").value.toLowerCase();
    const filterLevel = document.getElementById("filter_log_level").value;
    const rows = document.querySelectorAll('#logs_table .log_row');
    
    rows.forEach(row => {
        const message = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
        const level = row.dataset.level;
        
        const matchesSearch = message.includes(searchTerm);
        const matchesLevel = filterLevel === 'all' || level === filterLevel;
        
        row.style.display = (matchesSearch && matchesLevel) ? '' : 'none';
    });
}

function convertUsersToCSV(users) {
    const headers = ['Email', 'UID', 'План', 'Роль', 'Дата реєстрації', 'PRO діє до', 'Останній вхід'];
    const rows = users.map(u => [
        u.email,
        u.id,
        u.plan === 'pro' ? 'PRO' : 'FREE',
        u.role === 'admin' || u.isAdmin ? 'Адмін' : 'Користувач',
        new Date(u.createdAt).toLocaleDateString('uk-UA'),
        u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('uk-UA') : '',
        u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('uk-UA') : ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], {type: 'text/csv'});
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