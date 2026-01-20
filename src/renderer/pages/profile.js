import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function renderProfile(user, auth, db, onToVault, onToSettings, onToSubscribe) {
    const root = document.getElementById("root");
    
    // Перевірка чи користувач переданий
    if (!user || !user.uid || !user.email) {
        console.error('Invalid user object in renderProfile:', user);
        
        // Спробуємо отримати користувача з localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            user = JSON.parse(storedUser);
        } else {
            // Якщо немає користувача, повертаємо на логін
            alert('Користувача не знайдено. Будь ласка, увійдіть знову.');
            window.navigation?.showLogin?.();
            return;
        }
    }
    
    const initial = user.email ? user.email.charAt(0).toUpperCase() : '?';

    // 1. Отримуємо план та термін
    let userPlan = "free";
    let isPro = false;
    let expiresAt = 0;
    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            expiresAt = data.expiresAt || 0;
            isPro = data.plan === "pro" && expiresAt > Date.now();
            userPlan = isPro ? "pro" : "free";
        }
    } catch (e) { console.error(e); }

    // 2. Отримання статистики паролів
    let passCount = 0;
    try {
        const q = query(collection(db, "passwords"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        passCount = snap.size;
    } catch (e) { console.error(e); }

    // 3. Отримання нотаток
    let notes = [];
    try {
        const qNotes = query(collection(db, "notes"), where("userId", "==", user.uid));
        const snapNotes = await getDocs(qNotes);
        snapNotes.forEach(doc => notes.push({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error(e); }

    root.innerHTML = `
        <div class="sidebar">
            <h2 style="margin-bottom: 40px;">VaultSafe</h2>
            <div class="menu-item active" id="m_profile">👤 Мій Профіль</div>
            <div class="menu-item" id="m_vault">🔑 Паролі</div>
            <div class="menu-item" id="m_subscribe">👑 Підписка</div>
            <div class="menu-item" id="m_settings">⚙️ Налаштування</div>
            <div style="margin-top: auto;">
                <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; font-size: 12px;">
                    План: <b style="color: ${isPro ? '#eab308' : '#3b82f6'}; text-transform: uppercase;">${userPlan}</b>
                    ${isPro && expiresAt ? 
                        `<div style="font-size: 10px; margin-top: 3px; color: ${(expiresAt - Date.now()) < (7 * 24 * 60 * 60 * 1000) ? '#ef4444' : '#eab308'}">
                            До ${new Date(expiresAt).toLocaleDateString('uk-UA')}
                        </div>` : ''
                    }
                </div>
                <button id="btn_logout" style="background:none; border:none; color:#ef4444; cursor:pointer; width:100%; text-align:left; padding:10px;">Вийти</button>
            </div>
        </div>

        <div class="main-content">
            <div class="dashboard-grid">
                
                <!-- ЛІВА ЧАСТИНА: Профіль та Статистика -->
                <div class="left-col">
                    <div class="glass-card" style="display:flex; align-items:center; gap:20px;">
                        <div style="width:70px; height:70px; background:var(--accent); border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:30px; color:white; font-weight:bold;">${initial}</div>
                        <div>
                            <h2 style="margin:0;">Вітаємо, <span style="color:var(--accent);">${user.email ? user.email.split('@')[0] : 'Користувач'}</span></h2>
                            <p style="color:var(--text-dim); margin:5px 0 0 0;">Статус: <b style="color:${isPro ? '#eab308' : '#3b82f6'}">${userPlan.toUpperCase()}</b></p>
                        </div>
                    </div>

                    <div class="glass-card">
                        <h3 style="margin-top:0;">Статистика сейфу</h3>
                        <div style="display: flex; gap: 20px;">
                            <div style="flex: 1; text-align: center; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px;">
                                <div style="font-size:24px; font-weight:bold; color:var(--accent);">${passCount}</div>
                                <div style="font-size:11px; color:var(--text-dim);">ПАРОЛІВ</div>
                            </div>
                            <div style="flex: 1; text-align: center; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px;">
                                <div style="font-size:24px; font-weight:bold; color:#10b981;">${notes.length}</div>
                                <div style="font-size:11px; color:var(--text-dim);">НОТАТОК</div>
                            </div>
                        </div>
                        
                        ${!isPro ? `
                            <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05)); border-radius: 12px; border: 1px solid rgba(234, 179, 8, 0.2);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <h4 style="margin: 0; color: #eab308;">👑 Отримайте PRO</h4>
                                        <p style="margin: 5px 0 0 0; font-size: 12px; color: var(--text-dim);">Необмежені паролі, нотатки та більше</p>
                                    </div>
                                    <button id="btn_upgrade" style="background: #eab308; color: black; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                        Оновити за $4.99
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- ПРАВА ЧАСТИНА: Секретні нотатки -->
                <div class="right-col">
                    <div class="glass-card" style="height: 100%; display: flex; flex-direction: column;">
                        <h3 style="margin-top:0; display: flex; justify-content: space-between;">
                            Нотатки 
                            <span style="font-size: 12px; color: var(--text-dim); font-weight: normal;">
                                ${!isPro ? `${notes.length}/2` : 'Unlimited'}
                            </span>
                        </h3>
                        
                        <div id="notes_list" style="flex: 1; overflow-y: auto; margin-bottom: 15px; max-height: 250px;">
                            ${notes.length === 0 ? '<p style="color:var(--text-dim); font-size:13px;">Немає нотаток...</p>' : ''}
                            ${notes.map(n => `
                                <div class="glass-card" style="padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.02); position: relative;">
                                    <p style="margin: 0; font-size: 13px; color: #ddd; padding-right: 25px;">${n.text}</p>
                                    <button class="del-note" data-id="${n.id}" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px;">&times;</button>
                                </div>
                            `).join('')}
                        </div>

                        <div style="display: flex; gap: 5px;">
                            <input id="note_input" placeholder="Додати замітку..." style="margin:0; font-size:13px; padding: 10px;">
                            <button id="btn_add_note" style="width: auto; padding: 0 15px; font-size: 20px;">+</button>
                        </div>
                        <p id="note_error" style="color:#ef4444; font-size: 11px; margin-top: 5px;"></p>
                    </div>
                </div>

            </div>
        </div>
    `;

    // ЛОГІКА ДОДАВАННЯ НОТАТКИ
    document.getElementById("btn_add_note").onclick = async () => {
        const text = document.getElementById("note_input").value;
        const err = document.getElementById("note_error");

        if (!text) return;

        // Перевірка ліміту для Free
        if (!isPro && notes.length >= 2) {
            err.innerText = "Ліміт Free: 2 нотатки. Купіть PRO!";
            return;
        }

        try {
            await addDoc(collection(db, "notes"), {
                userId: user.uid,
                text: text,
                createdAt: Date.now()
            });
            renderProfile(user, auth, db, onToVault, onToSettings, onToSubscribe);
        } catch (e) { console.error(e); }
    };

    // ЛОГІКА ВИДАЛЕННЯ НОТАТКИ
    document.querySelectorAll('.del-note').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.target.getAttribute('data-id');
            await deleteDoc(doc(db, "notes", id));
            renderProfile(user, auth, db, onToVault, onToSettings, onToSubscribe);
        };
    });

    // Навігація
    document.getElementById("btn_logout").onclick = () => signOut(auth);
    document.getElementById("m_vault").onclick = () => {
        if (onToVault) {
            onToVault(user); // Передаем user явно
        } else if (window.navigation?.showVault) {
            window.navigation.showVault(user);
        }
    };

    document.getElementById("m_settings").onclick = () => {
        if (onToSettings) {
            onToSettings(user); // Передаем user явно
        } else if (window.navigation?.showSettings) {
            window.navigation.showSettings(user);
        }
    };

    document.getElementById("m_subscribe").onclick = () => {
        if (onToSubscribe) {
            onToSubscribe(user); // Передаем user явно
        } else if (window.navigation?.showSubscribe) {
            window.navigation.showSubscribe(user);
        }
    };
    
    // Кнопка апгрейда (если пользователь не PRO)
    if (document.getElementById('btn_upgrade')) {
        document.getElementById('btn_upgrade').onclick = () => {
            if (onToSubscribe) {
                onToSubscribe(user);
            } else if (window.navigation?.showSubscribe) {
                window.navigation.showSubscribe(user);
            } else {
                // Динамическая загрузка модуля подписки
                import('./subscribe.js').then(module => {
                    module.renderSubscribe(user, auth, db, 
                        () => renderProfile(user, auth, db, onToVault, onToSettings, onToSubscribe)
                    );
                }).catch(err => {
                    console.error('Error loading subscribe module:', err);
                    alert('Модуль підписки не завантажено');
                });
            }
        };
    }
    
    // Перевіряємо чи функції передані
    if (onToVault) {
        document.getElementById("m_vault").onclick = () => onToVault(user);
    } else if (window.navigation?.showVault) {
        document.getElementById("m_vault").onclick = () => window.navigation.showVault(user);
    } else {
        console.warn('Navigation to vault not configured');
    }
    
    if (onToSettings) {
        document.getElementById("m_settings").onclick = () => onToSettings(user);
    } else if (window.navigation?.showSettings) {
        document.getElementById("m_settings").onclick = () => window.navigation.showSettings(user);
    } else {
        console.warn('Navigation to settings not configured');
    }
    
    if (onToSubscribe) {
        document.getElementById("m_subscribe").onclick = () => onToSubscribe(user);
    } else if (window.navigation?.showSubscribe) {
        document.getElementById("m_subscribe").onclick = () => window.navigation.showSubscribe(user);
    } else {
        document.getElementById("m_subscribe").onclick = () => {
            // Динамическая загрузка модуля подписки
            import('./subscribe.js').then(module => {
                module.renderSubscribe(user, auth, db, 
                    () => renderProfile(user, auth, db, onToVault, onToSettings, onToSubscribe)
                );
            }).catch(err => {
                console.error('Error loading subscribe module:', err);
                alert('Модуль підписки не завантажено');
            });
        };
    }
    
    // Підсвічування активного меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById('m_profile').classList.add('active');
}