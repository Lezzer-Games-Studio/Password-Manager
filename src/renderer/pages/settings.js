import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function renderSettings(user, auth, db, onToProfile, onToVault, onToSubscribe) {
    const root = document.getElementById("root");

    // Перевіряємо чи користувач адмін
    let isAdmin = false;
    let userData = null;
    let isPro = false;
    let expiresAt = 0;
    
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            console.log("Дані користувача:", userData); // Для дебагу
            
            // Перевіряємо чи є поле role і чи воно дорівнює "admin"
            isAdmin = userData.role === "admin" || userData.isAdmin === true;
            
            // Проверяем статус PRO
            expiresAt = userData.expiresAt || 0;
            isPro = userData.plan === "pro" && expiresAt > Date.now();
            console.log("isAdmin:", isAdmin); // Для дебагу
            console.log("isPro:", isPro); // Для дебагу
        }
    } catch (e) { 
        console.error("Помилка перевірки прав:", e);
    }

    root.innerHTML = `
        <div class="sidebar">
            <h2 style="margin-bottom: 40px;">VaultSafe</h2>
            <div class="menu-item" id="m_profile">👤 Мій Профіль</div>
            <div class="menu-item" id="m_vault">🔑 Паролі</div>
            <div class="menu-item" id="m_subscribe">👑 Підписка</div>
            <div class="menu-item active" id="m_settings">⚙️ Налаштування</div>
            <div style="margin-top: auto;">
                <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; font-size: 12px;">
                    План: <b style="color: ${isPro ? '#eab308' : '#3b82f6'}; text-transform: uppercase;">${isPro ? 'PRO' : 'FREE'}</b>
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
            <h1>⚙️ Налаштування</h1>
            
            <div class="glass-card">
                <h3>Налаштування акаунта</h3>
                <p>Email: <strong>${user.email}</strong></p>
                <p>ID користувача: <code style="font-size: 12px; background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 4px;">${user.uid}</code></p>
                <p>План: <span style="color: ${isPro ? '#eab308' : '#3b82f6'}">${isPro ? '👑 PRO' : '⚪ FREE'}</span></p>
                <p>Статус: <span style="color: ${isAdmin ? '#eab308' : '#3b82f6'}">${isAdmin ? '👑 Адміністратор' : '👤 Користувач'}</span></p>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 5px;">
                    Role в базі: <code>${userData?.role || 'не встановлено'}</code>
                </p>
                
                ${!isPro ? `
                    <div style="margin-top: 15px; padding: 10px; background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05)); border-radius: 8px; border: 1px solid rgba(234, 179, 8, 0.2);">
                        <p style="margin: 0; font-size: 14px; color: #eab308;">
                            Отримайте PRO для розблоковки всіх функцій!
                        </p>
                        <button id="btn_upgrade_from_settings" style="margin-top: 8px; background: #eab308; color: black; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">
                            👑 Оновити до PRO
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Блок адміністратора (показується тільки адмінам) -->
            ${isAdmin ? `
                <div class="glass-card" style="border-left: 4px solid #eab308; margin-top: 20px;">
                    <h3 style="color: #eab308;">👑 Адміністрація</h3>
                    <p style="color: var(--text-dim); font-size: 14px; margin-bottom: 15px;">
                        Панель управління системою
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <button id="btn_admin_panel" style="background: #eab308; color: black; padding: 15px; border-radius: 8px; border: none; cursor: pointer; text-align: left;">
                            <div style="font-size: 20px;">📊</div>
                            <div style="font-weight: bold;">Адмін панель</div>
                            <div style="font-size: 12px; opacity: 0.8;">Управління системою</div>
                        </button>
                        
                        <button id="btn_generate_keys" style="background: rgba(59,130,246,0.2); color: white; padding: 15px; border-radius: 8px; border: none; cursor: pointer; text-align: left;">
                            <div style="font-size: 20px;">🔑</div>
                            <div style="font-weight: bold;">Ключі</div>
                            <div style="font-size: 12px; opacity: 0.8;">Генерація ключів</div>
                        </button>
                    </div>
                </div>
            ` : ''}

            <div class="glass-card" style="margin-top: 20px;">
                <h3>Безпека</h3>
                <button id="btn_change_password" style="width: 100%; text-align: left; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; cursor: pointer; margin-bottom: 10px;">
                    🔒 Змінити пароль
                </button>
                <button id="btn_delete_account" style="width: 100%; text-align: left; padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; color: #ef4444; cursor: pointer;">
                    🗑️ Видалити акаунт
                </button>
            </div>

            <div class="glass-card" style="margin-top: 20px; font-size: 12px; color: var(--text-dim);">
                <p>Версія додатку: 1.0.0</p>
                <p>© 2024 VaultSafe. Всі права захищені.</p>
            </div>
        </div>
    `;

    // Кнопка виходу
    document.getElementById("btn_logout").onclick = () => signOut(auth);

    // Навігація
    document.getElementById("m_profile").onclick = () => {
        if (onToProfile) onToProfile(user);
        else if (window.navigation?.showProfile) {
            window.navigation.showProfile(user);
        }
    };
    
    document.getElementById("m_vault").onclick = () => {
        if (onToVault) onToVault(user);
        else if (window.navigation?.showVault) {
            window.navigation.showVault(user);
        }
    };
    
    document.getElementById("m_subscribe").onclick = () => {
        if (onToSubscribe) {
            onToSubscribe(user);
        } else if (window.navigation?.showSubscribe) {
            window.navigation.showSubscribe(user);
        } else {
            // Динамическая загрузка модуля подписки
            import('./subscribe.js').then(module => {
                module.renderSubscribe(user, auth, db, 
                    () => renderSettings(user, auth, db, onToProfile, onToVault, onToSubscribe)
                );
            }).catch(err => {
                console.error('Error loading subscribe module:', err);
                alert('Модуль підписки не завантажено');
            });
        }
    };

    // Кнопка апгрейда из настроек
    if (document.getElementById('btn_upgrade_from_settings')) {
        document.getElementById('btn_upgrade_from_settings').onclick = () => {
            if (onToSubscribe) {
                onToSubscribe(user);
            } else if (window.navigation?.showSubscribe) {
                window.navigation.showSubscribe(user);
            } else {
                import('./subscribe.js').then(module => {
                    module.renderSubscribe(user, auth, db, 
                        () => renderSettings(user, auth, db, onToProfile, onToVault, onToSubscribe)
                    );
                });
            }
        };
    }

    // Кнопки адміністратора (тільки якщо адмін)
    if (isAdmin) {
        document.getElementById("btn_admin_panel").onclick = async () => {
            const { renderAdmin } = await import('./admin.js');
            renderAdmin(user, auth, db, 
                () => renderSettings(user, auth, db, onToProfile, onToVault, onToSubscribe)
            );
        };

        document.getElementById("btn_generate_keys").onclick = async () => {
            const { renderAdminKeys } = await import('./admin-keys.js');
            renderAdminKeys(user, auth, db,
                () => renderSettings(user, auth, db, onToProfile, onToVault, onToSubscribe)
            );
        };
    }

    // Інші кнопки (для всіх користувачів)
    document.getElementById("btn_change_password").onclick = () => {
        alert("Функція зміни пароля в розробці");
    };

    document.getElementById("btn_delete_account").onclick = () => {
        if (confirm("Ви впевнені, що хочете видалити акаунт? Цю дію неможливо скасувати.")) {
            alert("Функція видалення акаунта в розробці");
        }
    };

    // Підсвічування активного меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById('m_settings').classList.add('active');
}