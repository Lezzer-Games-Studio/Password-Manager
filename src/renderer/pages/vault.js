import { 
    collection, query, where, getDocs, doc, deleteDoc, addDoc, getDoc, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function renderVault(user, auth, db, onToProfile, onToSettings, onToSubscribe, onToNotes) {
    const root = document.getElementById("root");

    // --- ⏱️ ФУНКЦІЯ: АВТО-ВИХІД ---
    let logoutTimer;
    const resetTimer = () => {
        clearTimeout(logoutTimer);
        logoutTimer = setTimeout(() => {
            alert("Ви автоматично вийшли через тривалу бездіяльність.");
            signOut(auth);
        }, 10 * 60 * 1000);
    };
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => 
        document.addEventListener(evt, resetTimer, true)
    );
    resetTimer();

    // Завантаження даних
    let passwords = [];
    let isPro = false;
    let selectedIds = new Set();

    try {
        const [passSnap, userSnap] = await Promise.all([
            getDocs(query(collection(db, "passwords"), where("userId", "==", user.uid))),
            getDoc(doc(db, "users", user.uid))
        ]);
        passSnap.forEach(doc => passwords.push({ id: doc.id, ...doc.data() }));
        // Сортування: нові зверху
        passwords.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (userSnap.exists()) isPro = userSnap.data().plan === "pro";
    } catch (e) { console.error("Помилка БД:", e); }

    // --- 🔍 АНАЛІЗ БЕЗПЕКИ ---
    const weakPasses = passwords.filter(p => p.password && p.password.length < 8);
    const reusedPasses = passwords.filter((p, index) => 
        passwords.findIndex(item => item.password === p.password) !== index
    );

    // --- HTML СТРУКТУРА ---
    root.innerHTML = `
    <style>
        
        /* Layout */
        .app-container { display: flex; height: 100vh; width: 100vw; }
        
        /* Sidebar */
        .sidebar { width: 260px; background: var(--sidebar-bg); padding: 30px 20px; display: flex; flex-direction: column; border-right: 1px solid var(--border); flex-shrink: 0; }
        .menu-item { padding: 12px 15px; border-radius: 10px; cursor: pointer; color: var(--text-dim); margin-bottom: 5px; transition: 0.2s; display: flex; align-items: center; gap: 10px; }
        .menu-item:hover { background: rgba(255,255,255,0.05); color: white; }
        .menu-item.active { background: var(--accent); color: white; font-weight: 500; }
        
        /* Main Content */
        .main-content { flex-grow: 1; padding: 40px; overflow-y: auto; position: relative; }

        /* UI Elements */
        .filter-btn { background: rgba(255,255,255,0.05); color: var(--text-dim); border: 1px solid var(--border); padding: 8px 16px; border-radius: 20px; cursor: pointer; transition: 0.3s; font-size: 13px; }
        .filter-btn:hover { border-color: var(--accent); color: white; }
        .filter-btn.active { background: var(--accent); border-color: var(--accent); color: white; box-shadow: 0 0 15px rgba(59,130,246,0.3); }
        
        .stat-card { background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 12px; border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: center; }
        
        .pass-card { background: rgba(30, 41, 59, 0.4); border-radius: 16px; transition: 0.2s; backdrop-filter: blur(10px); }
        .pass-card:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); background: rgba(30, 41, 59, 0.6); }

        /* --- 🔥 ВИПРАВЛЕНИЙ ЧЕКБОКС --- */
        .pass-select {
            appearance: none;
            -webkit-appearance: none; /* Для Safari/Chrome */
            width: 20px;
            height: 20px;
            border: 2px solid var(--text-dim);
            border-radius: 6px;
            background: rgba(0,0,0,0.3);
            cursor: pointer;
            position: absolute;
            top: 15px;
            right: 15px;
            z-index: 10;
            transition: 0.2s;
            display: grid;
            place-content: center;
        }
        .pass-select:hover { border-color: white; }
        .pass-select:checked {
            background: var(--accent);
            border-color: var(--accent);
        }
        /* Галочка всередині чекбокса */
        .pass-select:checked::before {
            content: "✔";
            font-size: 12px;
            color: white;
            font-weight: bold;
        }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 1000; display: none; justify-content: center; align-items: center; }
        .modal-box { background: #1e293b; width: 400px; padding: 30px; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .input-group { margin-bottom: 15px; }
        .input-group label { display: block; font-size: 12px; color: var(--text-dim); margin-bottom: 5px; }
        .modal-input { width: 100%; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 8px; color: white; box-sizing: border-box; outline: none; }
        .modal-input:focus { border-color: var(--accent); }
        /* Ефект скляного вікна */
    .glass-modal {
        background: rgba(30, 41, 59, 0.8) !important;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        width: 420px !important;
        padding: 0 !important; /* Прибираємо внутрішні падінги для секцій */
        overflow: hidden;
    }

    .modal-header {
        padding: 25px 30px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .modal-body {
        padding: 20px 30px;
    }

    .modal-footer {
        padding: 20px 30px 30px;
        display: flex;
        gap: 12px;
    }

    /* Покращені лейбли */
    .input-group label {
        font-weight: 500;
        color: var(--text-main);
        margin-bottom: 8px;
        display: block;
        font-size: 13px;
        opacity: 0.9;
    }

    /* Поля вводу */
    .modal-input {
        background: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        transition: all 0.3s ease;
        font-size: 14px;
    }

    .modal-input:focus {
        border-color: var(--accent) !important;
        background: rgba(15, 23, 42, 0.9) !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    /* Контейнер для пароля та кнопки кубика */
    .password-input-container {
        position: relative;
        display: flex;
        align-items: center;
    }

    .gen-btn {
        position: absolute;
        right: 8px;
        height: 32px;
        width: 32px;
        border-radius: 6px;
        border: none;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .gen-btn:hover {
        background: var(--accent);
        transform: rotate(15deg);
    }

    /* Кнопки */
    .modal-btn {
        flex: 1;
        padding: 12px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .btn-primary {
        background: var(--accent);
        color: white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
    }

    .custom-select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C2.185 5.355 2.403 5 2.808 5h9.384c.405 0 .623.355.357.658l-4.796 5.482a.5.5 0 0 1-.722 0z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 15px center;
    }
    </style>

    <div class="app-container">
        <div class="sidebar">
            <h2 style="margin-bottom: 40px; color: var(--accent); display: flex; align-items: center; gap: 10px;">
                🛡️ VaultSafe
            </h2>
            <div class="menu-item" id="m_profile">👤 Профіль</div>
            <div class="menu-item active" id="m_vault">🔑 Паролі</div>
            <div class="menu-item" id="m_notes">📝 Нотатки</div> 
            <div class="menu-item" id="m_subscribe">👑 PRO Доступ</div>
            
            <div style="margin-top: auto;">
                <button id="btn_logout" style="width:100%; padding:12px; background:rgba(239,68,68,0.1); color:#ef4444; border:none; border-radius:10px; cursor:pointer; font-weight:600; transition:0.2s;">🚪 Вийти</button>
            </div>
        </div>

        <div class="main-content">
            <header style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px;">
                <div>
                    <h1 style="margin:0 0 5px 0; font-size: 28px;">Сейф</h1>
                    <p style="color:var(--text-dim); margin:0; font-size:14px;">Збережено: ${passwords.length} записів</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="btn_export_data" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:white; padding:10px 16px; border-radius:10px; cursor:pointer; transition:0.2s;">📤 Експорт</button>
                    <button id="btn_import_trigger" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:white; padding:10px 16px; border-radius:10px; cursor:pointer; transition:0.2s;">📥 Імпорт</button>
                    <button id="btn_add_password" style="background:var(--accent); color:white; border:none; padding:10px 24px; border-radius:10px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition:0.2s;">+ Додати</button>
                </div>
            </header>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                <div class="stat-card">
                    <div style="font-size:13px; color:var(--text-dim); margin-bottom:5px;">Слабкі паролі</div>
                    <div style="font-size:24px; font-weight:bold; color:${weakPasses.length > 0 ? '#ef4444' : '#4ade80'}">${weakPasses.length}</div>
                </div>
                <div class="stat-card">
                    <div style="font-size:13px; color:var(--text-dim); margin-bottom:5px;">Дублікати</div>
                    <div style="font-size:24px; font-weight:bold; color:${reusedPasses.length > 0 ? '#eab308' : '#4ade80'}">${reusedPasses.length}</div>
                </div>
                <div class="stat-card">
                    <div style="font-size:13px; color:var(--text-dim); margin-bottom:5px;">Рівень захисту</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--accent);">${Math.round(((passwords.length - weakPasses.length)/passwords.length || 0)*100)}%</div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 25px; overflow-x: auto; padding-bottom: 5px;">
                <button class="filter-btn active" data-cat="all">Всі</button>
                <button class="filter-btn" data-cat="Соцмережі">Соцмережі</button>
                <button class="filter-btn" data-cat="Пошта">Пошта</button>
                <button class="filter-btn" data-cat="Фінанси">Фінанси</button>
                <button class="filter-btn" data-cat="Інше">Інше</button>
            </div>

            <div id="selection_bar" style="display:none; background:var(--accent); color:white; padding:12px 20px; border-radius:12px; margin-bottom:20px; justify-content:space-between; align-items:center; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                <span style="font-weight:600;">Вибрано: <b id="sel_count">0</b></span>
                <div style="display:flex; gap:10px;">
                    <button id="btn_bulk_delete" style="background:#ef4444; border:none; color:white; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600;">Видалити</button>
                    <button id="btn_delete_all" style="background:rgba(0,0,0,0.2); border:none; color:white; padding:8px 16px; border-radius:8px; cursor:pointer;">Видалити все</button>
                </div>
            </div>

            <div id="import_zone" style="display:none; margin-bottom:20px;">
                <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                    <div id="prog_bar" style="width:0%; height:100%; background:var(--accent); transition:0.3s;"></div>
                </div>
                <div style="text-align:center; font-size:12px; margin-top:5px; color:var(--text-dim);">Імпорт даних...</div>
            </div>

            <input type="file" id="csv_file_input" accept=".csv" style="display: none;">

            <div id="passwords_grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                ${passwords.map(p => `
                    <div class="pass-card" data-category="${p.category || 'Інше'}" style="padding: 20px; position: relative; border: 1px solid var(--border);">
                        <input type="checkbox" class="pass-select" data-id="${p.id}">
                        
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-right: 30px;">
                            <img src="https://www.google.com/s2/favicons?domain=${(p.website && p.website.includes('.')) ? p.website : 'google.com'}&sz=64" 
                                 style="width:42px; height:42px; border-radius:10px; background:white; padding:4px; object-fit:contain;"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.website || 'Unknown')}&background=random'">
                            <div style="overflow:hidden;">
                                <div style="font-weight: 600; font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.website || ''}</div>
                                <div style="font-size: 13px; color: var(--text-dim); margin-top:2px;">${p.login || ''}</div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <button class="btn-copy" data-pass="${p.password || ''}" style="flex:1; padding:10px; font-size:13px; background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:8px; cursor:pointer; transition:0.2s;">Копіювати</button>
                            <button class="btn-delete-single" data-id="${p.id}" style="padding:10px 14px; background:rgba(239,68,68,0.1); color:#ef4444; border:none; border-radius:8px; cursor:pointer;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

   <div id="modal_add" class="modal-overlay">
    <div class="modal-box glass-modal">
        <div class="modal-header">
            <h2 style="margin:0; font-size: 20px; letter-spacing: 0.5px;">Новий пароль</h2>
            <p style="color: var(--text-dim); font-size: 13px; margin: 5px 0 0 0;">Додайте дані для безпечного зберігання</p>
        </div>
        
        <div class="modal-body">
            <div class="input-group">
                <label><i class="icon-web"></i> Вебсайт</label>
                <input type="text" id="inp_website" class="modal-input" placeholder="example.com">
            </div>
            
            <div class="input-group">
                <label><i class="icon-user"></i> Логін / Email</label>
                <input type="text" id="inp_login" class="modal-input" placeholder="user@mail.com">
            </div>
            
            <div class="input-group">
                <label><i class="icon-lock"></i> Пароль</label>
                <div class="password-input-container">
                    <input type="text" id="inp_password" class="modal-input" placeholder="Введіть або згенеруйте">
                    <button id="btn_gen_pass" class="gen-btn" title="Згенерувати надійний пароль">
                        <span>🎲</span>
                    </button>
                </div>
            </div>

            <div class="input-group">
                <label><i class="icon-tag"></i> Категорія</label>
                <div class="select-wrapper">
                    <select id="inp_category" class="modal-input custom-select">
                        <option value="Інше">🌐 Інше</option>
                        <option value="Соцмережі">📱 Соцмережі</option>
                        <option value="Пошта">📧 Пошта</option>
                        <option value="Фінанси">💰 Фінанси</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button id="btn_cancel_add" class="modal-btn btn-secondary">Скасувати</button>
            <button id="btn_save_add" class="modal-btn btn-primary">Зберегти запис</button>
        </div>
    </div>
</div>
    `;

    // --- ЛОГІКА ТА ОБРОБНИКИ ---

    // 1. Модальне вікно "Додати"
    const modalAdd = document.getElementById('modal_add');
    const btnAddPass = document.getElementById('btn_add_password');
    const btnCancelAdd = document.getElementById('btn_cancel_add');
    const btnSaveAdd = document.getElementById('btn_save_add');
    const btnGenPass = document.getElementById('btn_gen_pass');

    btnAddPass.onclick = () => {
        // Очистити поля
        document.getElementById('inp_website').value = '';
        document.getElementById('inp_login').value = '';
        document.getElementById('inp_password').value = '';
        modalAdd.style.display = 'flex';
    };

    btnCancelAdd.onclick = () => {
        modalAdd.style.display = 'none';
    };

    // Генерація пароля
    btnGenPass.onclick = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let pass = "";
        for (let i = 0; i < 16; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('inp_password').value = pass;
    };

    // Збереження нового пароля
    btnSaveAdd.onclick = async () => {
        const website = document.getElementById('inp_website').value.trim();
        const login = document.getElementById('inp_login').value.trim();
        const password = document.getElementById('inp_password').value.trim();
        const category = document.getElementById('inp_category').value;

        if (!website || !password) {
            alert("Будь ласка, вкажіть сайт та пароль");
            return;
        }

        // Перевірка ліміту для безкоштовного тарифу
        if (!isPro && passwords.length >= 10) {
            alert("🔒 Ліміт записів (10) вичерпано. Придбайте PRO!");
            onToSubscribe(user);
            return;
        }

        btnSaveAdd.innerText = "⏳";
        try {
            await addDoc(collection(db, "passwords"), {
                userId: user.uid,
                website,
                login,
                password,
                category,
                createdAt: Date.now()
            });
            modalAdd.style.display = 'none';
            renderVault(user, auth, db, onToProfile, onToSettings, onToSubscribe, onToNotes); // Перемалювати
        } catch (e) {
            console.error(e);
            alert("Помилка збереження");
        }
    };

    // Закриття модального вікна при кліку на фон
    modalAdd.onclick = (e) => {
        if (e.target === modalAdd) modalAdd.style.display = 'none';
    };

    // 2. Експорт / Імпорт
    const importInput = document.getElementById('csv_file_input');
    
    document.getElementById('btn_export_data').onclick = () => {
        let csv = "website,login,password,category\n";
        passwords.forEach(p => csv += `"${p.website}","${p.login}","${p.password}","${p.category || 'Інше'}"\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'VaultSafe_Backup.csv';
        a.click();
    };

    document.getElementById('btn_import_trigger').onclick = () => importInput.click();
    importInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const lines = evt.target.result.split('\n').filter(l => l.trim());
            document.getElementById('import_zone').style.display = 'block';
            let batch = writeBatch(db);
            let count = 0;
            let currentTotal = passwords.length;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/"/g, ''));
                // Ліміт
                if (!isPro && (currentTotal + count) >= 10) break;

                const newRef = doc(collection(db, "passwords"));
                batch.set(newRef, {
                    userId: user.uid,
                    website: cols[0] || "Unknown",
                    login: cols[2] || cols[1] || "",
                    password: cols[3] || "",
                    category: "Інше",
                    createdAt: Date.now()
                });
                count++;
                document.getElementById('prog_bar').style.width = (i/(lines.length-1)*100) + '%';
            }
            await batch.commit();
            renderVault(user, auth, db, onToProfile, onToSettings, onToSubscribe, onToNotes);
        };
        reader.readAsText(file);
    };

    // 3. Фільтрація
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.cat;
            document.querySelectorAll('.pass-card').forEach(card => {
                card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'block' : 'none';
            });
        };
    });

    // 4. Видалення та вибір
    document.querySelectorAll('.pass-select').forEach(cb => {
        cb.onchange = (e) => {
            const id = e.target.dataset.id;
            e.target.checked ? selectedIds.add(id) : selectedIds.delete(id);
            const selectionBar = document.getElementById('selection_bar');
            selectionBar.style.display = selectedIds.size > 0 ? 'flex' : 'none';
            document.getElementById('sel_count').innerText = selectedIds.size;
        };
    });

    document.querySelectorAll('.btn-delete-single').forEach(btn => {
        btn.onclick = async (e) => {
            if(!confirm("Видалити цей пароль?")) return;
            await deleteDoc(doc(db, "passwords", e.target.dataset.id));
            renderVault(user, auth, db, onToProfile, onToSettings, onToSubscribe, onToNotes);
        }
    });

    document.getElementById('btn_bulk_delete').onclick = async () => {
        if (!confirm('Видалити вибране?')) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, "passwords", id)));
        await batch.commit();
        renderVault(user, auth, db, onToProfile, onToSettings, onToSubscribe, onToNotes);
    };

    document.getElementById('btn_delete_all').onclick = async () => {
        if (!confirm('🚨 ВИДАЛИТИ ВСІ ПАРОЛІ? Це незворотно!')) return;
        const batch = writeBatch(db);
        passwords.forEach(p => batch.delete(doc(db, "passwords", p.id)));
        await batch.commit();
        renderVault(user, auth, db, onToProfile, onToSettings, onToSubscribe, onToNotes);
    };

    // 5. Копіювання
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.onclick = (e) => {
            navigator.clipboard.writeText(e.target.dataset.pass);
            const originalText = e.target.innerText;
            const originalBg = e.target.style.background;
            
            e.target.innerText = "Скопійовано!";
            e.target.style.background = "#22c55e"; // Зелений колір
            e.target.style.borderColor = "#22c55e";

            setTimeout(() => {
                e.target.innerText = originalText;
                e.target.style.background = originalBg;
                e.target.style.borderColor = "rgba(255,255,255,0.1)";
            }, 1500);
        };
    });

    // Навігація
    document.getElementById("btn_logout").onclick = () => signOut(auth);
    document.getElementById("m_profile").onclick = () => onToProfile(user);
    document.getElementById("m_subscribe").onclick = () => onToSubscribe(user);
    document.getElementById("m_notes").onclick = () => onToNotes(user);
}
