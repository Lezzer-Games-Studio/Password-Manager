import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function renderProfile(user, auth, db, onToVault, onToSettings, onToSubscribe, onToNotes) {
    const root = document.getElementById("root");
    
    // Перевірка користувача
    if (!user || !user.uid) {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) user = JSON.parse(storedUser);
        else {
            window.navigation?.showLogin?.();
            return;
        }
    }
    
    const initial = user.email ? user.email.charAt(0).toUpperCase() : '?';

    // 1. Дані про підписку
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

    // 2. Статистика
    let passCount = 0;
    let notesCount = 0;
    try {
        const pSnap = await getDocs(query(collection(db, "passwords"), where("userId", "==", user.uid)));
        passCount = pSnap.size;
        const nSnap = await getDocs(query(collection(db, "notes"), where("userId", "==", user.uid)));
        notesCount = nSnap.size;
    } catch (e) { console.error(e); }

    root.innerHTML = `
<div class="sidebar">
    <h2 style="margin-bottom: 40px;">VaultSafe</h2>
    <div class="menu-item active" id="m_profile">👤 Мій Профіль</div>
    <div class="menu-item" id="m_vault">🔑 Паролі</div>
    <div class="menu-item" id="m_notes">📝 Нотатки</div> 
    <div class="menu-item" id="m_subscribe">👑 Підписка</div>
    <div class="menu-item" id="m_settings">⚙️ Налаштування</div>
    
    <div style="margin-top: auto;">
        <div id="plan_info_sidebar" style="padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; margin-bottom: 10px; font-size: 12px; color: #fff;">
            Поточний план: <b style="color: ${isPro ? '#eab308' : '#3b82f6'}">${userPlan.toUpperCase()}</b>
        </div>
        <button id="btn_logout" style="background:none; border:none; color:#ef4444; cursor:pointer; width:100%; text-align:left; padding:10px; font-weight:600;">Вийти з аккаунту</button>
    </div>
</div>

<div class="main-content">
    <header style="margin-bottom: 30px;">
        <h1 style="margin:0;">Мій кабінет</h1>
        <p style="color: var(--text-dim);">Керуйте своєю безпекою та даними в одному місці</p>
    </header>

    <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr; gap: 24px;">
        
        <div class="left-col" style="display: flex; flex-direction: column; gap: 24px;">
            <div class="glass-card" style="display:flex; align-items:center; gap:25px; padding: 30px;">
                <div style="width:80px; height:80px; background: linear-gradient(135deg, var(--accent), #1d4ed8); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:35px; color:white; font-weight:bold; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);">${initial}</div>
                <div>
                    <h2 style="margin:0; font-size: 24px;">${user.email ? user.email.split('@')[0] : 'Користувач'}</h2>
                    <p style="color:var(--text-dim); margin:5px 0 15px 0;">${user.email}</p>
                    <span style="padding: 5px 12px; background: ${isPro ? 'rgba(234, 179, 8, 0.1)' : 'rgba(59, 130, 246, 0.1)'}; color: ${isPro ? '#eab308' : '#3b82f6'}; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid ${isPro ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)'};">
                        ${isPro ? '👑 PREMIUM АККАУНТ' : '🛡️ FREE ПЛАН'}
                    </span>
                </div>
            </div>

            <div class="glass-card" style="padding: 30px;">
                <h3 style="margin-top:0; margin-bottom: 20px;">Загальна статистика</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 16px; border: 1px solid var(--border); text-align: center;">
                        <div style="font-size:32px; font-weight:bold; color:var(--accent); margin-bottom: 5px;">${passCount}</div>
                        <div style="font-size:12px; color:var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Паролів</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 16px; border: 1px solid var(--border); text-align: center;">
                        <div style="font-size:32px; font-weight:bold; color:#10b981; margin-bottom: 5px;">${notesCount}</div>
                        <div style="font-size:12px; color:var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Нотаток</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="right-col" style="display: flex; flex-direction: column; gap: 24px;">
            <div class="glass-card" style="padding: 30px; background: ${isPro ? 'var(--card-bg)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(15, 17, 23, 0))'};">
                <h3 style="margin-top:0;">Статус безпеки</h3>
                <div style="display: flex; align-items: center; gap: 15px; margin-top: 15px; padding: 15px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2);">
                    <div style="font-size: 20px;">🛡️</div>
                    <div>
                        <div style="font-weight: bold; color: #10b981; font-size: 14px;">Ваш сейф захищено</div>
                        <div style="font-size: 12px; color: var(--text-dim);">Всі дані зашифровані за стандартом AES-256</div>
                    </div>
                </div>

                ${!isPro ? `
                    <div style="margin-top: 25px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #eab308;">👑 Бажаєте більше можливостей?</h4>
                        <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin-bottom: 15px;">
                            Перейдіть на PRO, щоб отримати необмежену кількість паролів, сповіщення про нагадування та пріоритетну підтримку.
                        </p>
                        <button id="btn_upgrade_main" style="background: #eab308; color: black; border: none; width: 100%; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.3s;">
                            Стати PREMIUM користувачем
                        </button>
                    </div>
                ` : `
                    <div style="margin-top: 25px; padding: 15px; background: rgba(234, 179, 8, 0.05); border-radius: 12px; border: 1px dashed rgba(234, 179, 8, 0.3);">
                        <div style="font-size: 13px; color: #eab308;">✅ Ваша підписка активна до: <b>${new Date(expiresAt).toLocaleDateString()}</b></div>
                    </div>
                `}
            </div>

            <div class="glass-card" style="padding: 30px;">
                <h3 style="margin-top:0; margin-bottom: 15px;">Швидкі дії</h3>
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                    <button class="menu-item" id="quick_pass" style="width: 100%; border: 1px solid var(--border); background: rgba(255,255,255,0.02); justify-content: flex-start; padding: 15px;">🔑 Перейти до паролів</button>
                    <button class="menu-item" id="quick_notes" style="width: 100%; border: 1px solid var(--border); background: rgba(255,255,255,0.02); justify-content: flex-start; padding: 15px;">📝 Створити нотатку</button>
                </div>
            </div>
        </div>
    </div>
</div>
    `;

    // ОБРОБНИКИ ПОДІЙ
    document.getElementById("btn_logout").onclick = () => signOut(auth);
    
    // Навігація через пункти меню та швидкі кнопки
    const navActions = {
        m_vault: onToVault,
        quick_pass: onToVault,
        m_notes: onToNotes,
        quick_notes: onToNotes,
        m_settings: onToSettings,
        m_subscribe: onToSubscribe
    };

    Object.entries(navActions).forEach(([id, action]) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => action ? action(user) : console.warn(`Action for ${id} missing`);
    });

    if (document.getElementById('btn_upgrade_main')) {
        document.getElementById('btn_upgrade_main').onclick = () => onToSubscribe(user);
    }
}