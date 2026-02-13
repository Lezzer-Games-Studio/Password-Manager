// ОНОВЛЕНІ НОТАТКИ З ПОВТОРЮВАНИМИ НАГАДУВАННЯМИ + ОНОВЛЕНИЙ UI
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function renderNotes(user, auth, db, onToProfile, onToVault, onToSettings, onToSubscribe) {
    const root = document.getElementById("root");

    // 🔔 Дозвіл на сповіщення
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }

    let notes = [];
    const q = query(collection(db, "notes"), where("userId", "==", user.uid));
    const snap = await getDocs(q);
    snap.forEach(d => notes.push({ id: d.id, ...d.data() }));
    notes.sort((a, b) => b.createdAt - a.createdAt);

    root.innerHTML = `
    <div class="sidebar">
        <h2>VaultSafe</h2>
        <div class="menu-item" id="m_profile">👤 Профіль</div>
        <div class="menu-item" id="m_vault">🔑 Паролі</div>
        <div class="menu-item active">📝 Нотатки</div>
        <div class="menu-item" id="m_subscribe">👑 PRO</div>
        <div class="menu-item" id="m_settings">⚙️ Налаштування</div>
        <button id="btn_logout" class="logout">Вийти</button>
    </div>

    <div class="main-content">
        <h1>📝 Нотатки & Нагадування</h1>
        <p class="subtitle">Одноразові та регулярні нагадування (понеділок, четвер і т.д.)</p>

        <div class="glass-card add-note">
            <textarea id="note_text" placeholder="Текст нотатки..."></textarea>

            <div class="controls">
                <input type="datetime-local" id="note_time">
                <select id="note_repeat">
                    <option value="none">Без повтору</option>
                    <option value="mon">Кожен понеділок</option>
                    <option value="tue">Кожен вівторок</option>
                    <option value="wed">Кожну середу</option>
                    <option value="thu">Кожен четвер</option>
                    <option value="fri">Кожну пʼятницю</option>
                    <option value="sat">Кожну суботу</option>
                    <option value="sun">Кожну неділю</option>
                </select>
                <button id="btn_add">➕ Додати</button>
            </div>
        </div>

        <div id="notes_list">
            ${notes.map(n => `
                <div class="glass-card note">
                    <div class="note-text">${n.text}</div>
                    <div class="note-meta">
                        ${n.reminder ? `🔔 ${new Date(n.reminder).toLocaleString()}` : ''}
                        ${n.repeat ? ` | 🔁 ${repeatLabel(n.repeat)}` : ''}
                    </div>
                    <button class="del" data-id="${n.id}">🗑️</button>
                </div>
            `).join('')}
        </div>
    </div>
    `;

    // ➕ Додавання
    document.getElementById('btn_add').onclick = async () => {
        const text = note_text.value.trim();
        if (!text) return alert("Введіть текст");

        const time = note_time.value ? new Date(note_time.value).getTime() : null;
        const repeat = note_repeat.value !== 'none' ? note_repeat.value : null;

        await addDoc(collection(db, "notes"), {
            userId: user.uid,
            text,
            reminder: time,
            repeat,
            createdAt: Date.now()
        });
        renderNotes(user, auth, db, onToProfile, onToVault, onToSettings, onToSubscribe);
    };

    // 🗑️ Видалення
    document.querySelectorAll('.del').forEach(b => {
        b.onclick = async () => {
            await deleteDoc(doc(db, "notes", b.dataset.id));
            renderNotes(user, auth, db, onToProfile, onToVault, onToSettings, onToSubscribe);
        };
    });

    // Навігація
    btn_logout.onclick = () => signOut(auth);
    m_profile.onclick = () => onToProfile();
    m_vault.onclick = () => onToVault();
    m_settings.onclick = () => onToSettings();
    m_subscribe.onclick = () => onToSubscribe();
}

function repeatLabel(r) {
    return {
        mon: 'Щопонеділка',
        tue: 'Щовівторка',
        wed: 'Щосереди',
        thu: 'Щочетверга',
        fri: 'Щопʼятниці',
        sat: 'Щосуботи',
        sun: 'Щонеділі'
    }[r] || '';
}
