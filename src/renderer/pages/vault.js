import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    deleteDoc, 
    addDoc,
    getDoc  // ДОБАВЬТЕ ЭТОТ ИМПОРТ
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function renderVault(user, auth, db, onToProfile, onToSettings) {
    const root = document.getElementById("root");
    
    // ВАЖНО: Проверяем пользователя
    if (!user || !user.uid) {
        console.error('No user provided to renderVault:', user);
        
        // Пробуем получить из localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            user = JSON.parse(storedUser);
        } else {
            // Если нет пользователя, показываем ошибку
            root.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; flex-direction: column;">
                    <h2>Помилка: користувача не знайдено</h2>
                    <button id="btn_back" style="margin-top: 20px; padding: 10px 20px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Повернутися до профілю
                    </button>
                </div>
            `;
            document.getElementById('btn_back').onclick = () => {
                if (onToProfile) onToProfile();
                else window.location.reload();
            };
            return;
        }
    }
    
    // Получаем пароли из Firestore
    let passwords = [];
    try {
        const q = query(collection(db, "passwords"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            passwords.push({ id: doc.id, ...doc.data() });
        });
    } catch (e) { 
        console.error('Error fetching passwords:', e);
        root.innerHTML = `<p>Помилка завантаження паролів: ${e.message}</p>`;
        return;
    }

    // Получаем статус PRO для проверки лимитов
    let isPro = false;
    try {
        // ИСПРАВЛЕНО: теперь getDoc импортирован
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            isPro = data.plan === "pro" && (data.expiresAt || 0) > Date.now();
        }
    } catch (e) { 
        console.error('Error checking PRO status:', e);
        // Продолжаем работу даже если не удалось проверить статус
    }

    root.innerHTML = `
        <div class="sidebar">
            <h2 style="margin-bottom: 40px;">VaultSafe</h2>
            <div class="menu-item" id="m_profile">👤 Мій Профіль</div>
            <div class="menu-item active" id="m_vault">🔑 Паролі</div>
            <div class="menu-item" id="m_subscribe">👑 Підписка</div>
            <div class="menu-item" id="m_settings">⚙️ Налаштування</div>
            <div style="margin-top: auto;">
                <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; font-size: 12px;">
                    Паролів: <b>${passwords.length}</b> ${!isPro ? '/ 5' : ''}
                </div>
                <button id="btn_logout" style="background:none; border:none; color:#ef4444; cursor:pointer; width:100%; text-align:left; padding:10px;">Вийти</button>
            </div>
        </div>

        <div class="main-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h1>🔑 Менеджер паролів</h1>
                <button id="btn_add_password" style="background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;" 
                    ${!isPro && passwords.length >= 50 ? 'disabled title="Ліміт Free: 50 паролів. Купіть PRO!"' : ''}>
                    + Додати пароль
                </button>
            </div>

            ${!isPro && passwords.length >= 45 ? `
                <div style="padding: 15px; background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05)); border-radius: 12px; border: 1px solid rgba(234, 179, 8, 0.2); margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="margin: 0; color: #eab308;">👑 Залишилось ${50 - passwords.length} паролів</h4>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: var(--text-dim);">Оновіть до PRO для необмежених паролів!</p>
                        </div>
                        <button id="btn_upgrade_from_vault" style="background: #eab308; color: black; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                            Оновити до PRO
                        </button>
                    </div>
                </div>
            ` : ''}

            <div class="glass-card">
                <div id="passwords_list">
                    ${passwords.length === 0 ? 
                        '<p style="text-align: center; color: var(--text-dim);">Немає збережених паролів. Додайте перший пароль!</p>' : 
                        passwords.map(p => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <div style="flex: 1;">
                                    <strong style="color: #fff;">${p.website || 'Без назви'}</strong>
                                    <div style="font-size: 12px; color: var(--text-dim); margin-top: 5px;">
                                        <span>👤 ${p.login || 'Немає логіна'}</span>
                                        <span style="margin-left: 15px;">🔒 ${'•'.repeat(p.password?.length || 6)}</span>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button class="btn_show_password" data-id="${p.id}" data-password="${p.password || ''}" style="background: #10b981; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                        Показати
                                    </button>
                                    <button class="btn_delete_password" data-id="${p.id}" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                        Видалити
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;

    // Кнопка выхода
    document.getElementById("btn_logout").onclick = () => signOut(auth);
    
    // Навигация
    document.getElementById("m_profile").onclick = () => {
        if (onToProfile) onToProfile(user);
        else if (window.navigation?.showProfile) {
            window.navigation.showProfile(user);
        }
    };
    
    document.getElementById("m_subscribe").onclick = () => {
        if (window.navigation?.showSubscribe) {
            window.navigation.showSubscribe(user);
        }
    };
    
    document.getElementById("m_settings").onclick = () => {
        if (onToSettings) onToSettings(user);
        else if (window.navigation?.showSettings) {
            window.navigation.showSettings(user);
        }
    };

    // Удаление пароля
    document.querySelectorAll('.btn_delete_password').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Видалити цей пароль?')) {
                try {
                    await deleteDoc(doc(db, "passwords", id));
                    renderVault(user, auth, db, onToProfile, onToSettings);
                } catch (error) {
                    console.error('Error deleting password:', error);
                    alert('Помилка видалення паролю');
                }
            }
        };
    });

    // Показать пароль
    document.querySelectorAll('.btn_show_password').forEach(btn => {
        btn.onclick = (e) => {
            const id = e.target.getAttribute('data-id');
            const password = e.target.getAttribute('data-password');
            const isHidden = e.target.textContent === 'Показати';
            
            if (isHidden) {
                e.target.textContent = password || '(пусто)';
                e.target.style.background = '#3b82f6';
                
                // Автоматически скрыть через 10 секунд
                setTimeout(() => {
                    if (e.target.textContent !== 'Показати') {
                        e.target.textContent = 'Показати';
                        e.target.style.background = '#10b981';
                    }
                }, 10000);
            } else {
                e.target.textContent = 'Показати';
                e.target.style.background = '#10b981';
            }
        };
    });

    // Добавление пароля
    document.getElementById("btn_add_password").onclick = async () => {
        // Проверяем лимит для Free
        if (!isPro && passwords.length >= 5) {
            alert('Ліміт Free: 5 паролів. Оновіть до PRO!');
            return;
        }
        
        // Создаем модальное окно
        const modalHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                <div style="background: var(--bg-light); padding: 30px; border-radius: 15px; width: 400px; max-width: 90%;">
                    <h3 style="margin-top: 0;">➕ Додати новий пароль</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px;">🌐 Сайт / Назва</label>
                        <input type="text" id="new_website" placeholder="Наприклад: google.com" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px;">👤 Логін / Email</label>
                        <input type="text" id="new_login" placeholder="your@email.com" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px;">🔒 Пароль</label>
                        <input type="password" id="new_password" placeholder="Введіть пароль" style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;">
                        <button id="btn_generate_password" style="margin-top: 5px; background: #8b5cf6; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">🎲 Згенерувати</button>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="btn_save_password" style="flex: 1; background: #10b981; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">💾 Зберегти</button>
                        <button id="btn_cancel_password" style="flex: 1; background: #6b7280; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">Скасувати</button>
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
        
        // Генерация пароля
        document.getElementById('btn_generate_password').onclick = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            document.getElementById('new_password').value = password;
            document.getElementById('new_password').type = 'text';
            
            // Показать на 3 секунды, потом скрыть
            setTimeout(() => {
                document.getElementById('new_password').type = 'password';
            }, 3000);
        };
        
        // Сохранение пароля
        document.getElementById('btn_save_password').onclick = async () => {
            const website = document.getElementById('new_website').value;
            const login = document.getElementById('new_login').value;
            const password = document.getElementById('new_password').value;
            
            if (!website.trim() || !password.trim()) {
                alert('Будь ласка, заповніть назву сайту та пароль');
                return;
            }
            
            try {
                await addDoc(collection(db, "passwords"), {
                    userId: user.uid,
                    website: website.trim(),
                    login: login.trim(),
                    password: password,
                    createdAt: Date.now()
                });
                
                document.body.removeChild(modal);
                renderVault(user, auth, db, onToProfile, onToSettings);
                
            } catch (error) {
                console.error('Error adding password:', error);
                alert('Помилка збереження паролю');
            }
        };
        
        // Отмена
        document.getElementById('btn_cancel_password').onclick = () => {
            document.body.removeChild(modal);
        };
    };

    // Кнопка апгрейда из vault
    if (document.getElementById('btn_upgrade_from_vault')) {
        document.getElementById('btn_upgrade_from_vault').onclick = () => {
            if (window.navigation?.showSubscribe) {
                window.navigation.showSubscribe(user);
            }
        };
    }
    
    // Подсветка активного меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById('m_vault').classList.add('active');
}