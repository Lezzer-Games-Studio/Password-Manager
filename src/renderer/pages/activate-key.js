// pages/activate-key.js
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    doc, 
    getDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function renderActivateKey(user, auth, db, onBack) {
    const root = document.getElementById("root");
    
    // Проверяем текущий статус пользователя
    let userData = { plan: "free", expiresAt: 0 };
    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            userData = userSnap.data();
        }
    } catch (e) { console.error(e); }
    
    const isPro = userData.plan === "pro" && (userData.expiresAt || 0) > Date.now();

    root.innerHTML = `
        <div class="sidebar">
            <h2 style="margin-bottom: 40px;">VaultSafe</h2>
            <div class="menu-item" id="m_profile">👤 Мій Профіль</div>
            <div class="menu-item" id="m_vault">🔑 Паролі</div>
            <div class="menu-item" id="m_subscribe">👑 Підписка</div>
            <div class="menu-item" id="m_settings">⚙️ Налаштування</div>
            <div style="margin-top: auto;">
                <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; font-size: 12px;">
                    План: <b style="color: ${isPro ? '#eab308' : '#3b82f6'}; text-transform: uppercase;">${isPro ? 'PRO' : 'FREE'}</b>
                </div>
                <button id="btn_logout" style="background:none; border:none; color:#ef4444; cursor:pointer; width:100%; text-align:left; padding:10px;">Вийти</button>
            </div>
        </div>

        <div class="main-content">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="text-align: center; margin-bottom: 30px;">🔑 Активація ліцензійного ключа</h1>
                
                <div class="glass-card">
                    <h3 style="margin-top: 0;">📝 Введіть ваш ключ</h3>
                    <p style="color: var(--text-dim); margin-bottom: 20px;">
                        Введіть ліцензійний ключ, щоб активувати PRO підписку або отримати інші привілеї.
                    </p>
                    
                    <div style="margin-bottom: 20px;">
                        <input type="text" id="license_key_input" placeholder="XXXX-XXXX-XXXX-XXXX" style="width: 100%; padding: 15px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white; font-size: 18px; letter-spacing: 2px; text-align: center; font-family: monospace;">
                        <p style="font-size: 12px; color: var(--text-dim); margin-top: 5px;">
                            Формат: 4 групи по 4 символи, розділені дефісами
                        </p>
                    </div>
                    
                    <button id="btn_activate_key" style="width: 100%; padding: 15px; background: #10b981; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; margin-bottom: 15px;">
                        ✅ Активувати ключ
                    </button>
                    
                    <div id="activation_result" style="display: none; margin-top: 20px; padding: 15px; border-radius: 8px;"></div>
                </div>
                
                <div class="glass-card" style="margin-top: 20px; background: rgba(59,130,246,0.05);">
                    <h4>ℹ️ Інформація про ключі</h4>
                    <ul style="color: var(--text-dim); font-size: 14px; line-height: 1.6;">
                        <li>Ключ можна використати тільки один раз</li>
                        <li>Після активації ключ прив'язується до вашого акаунта</li>
                        <li>PRO підписка активується на вказану в ключі кількість днів</li>
                        <li>Якщо у вас вже є активна підписка, дні будуть додані до поточної</li>
                        <li>Отримати ключ можна у адміністратора системи</li>
                    </ul>
                </div>
                
                <div class="glass-card" style="margin-top: 20px;">
                    <h4>📊 Статус вашого акаунта</h4>
                    <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-dim);">Поточний план</div>
                            <div style="font-weight: bold; color: ${isPro ? '#10b981' : '#3b82f6'}">${isPro ? '👑 PRO' : '⚪ FREE'}</div>
                        </div>
                        ${isPro && userData.expiresAt ? `
                            <div>
                                <div style="font-size: 12px; color: var(--text-dim);">Діє до</div>
                                <div style="font-weight: bold; color: ${(userData.expiresAt - Date.now()) < (7 * 24 * 60 * 60 * 1000) ? '#ef4444' : '#10b981'}">
                                    ${new Date(userData.expiresAt).toLocaleDateString('uk-UA')}
                                </div>
                            </div>
                        ` : ''}
                        <div>
                            <div style="font-size: 12px; color: var(--text-dim);">Залишилось днів</div>
                            <div style="font-weight: bold; color: #eab308;">
                                ${isPro && userData.expiresAt ? 
                                    Math.ceil((userData.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)) : '0'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Навигация
    document.getElementById("m_profile").onclick = () => {
        if (window.navigation?.showProfile) {
            window.navigation.showProfile(user);
        }
    };
    
    document.getElementById("m_vault").onclick = () => {
        if (window.navigation?.showVault) {
            window.navigation.showVault(user);
        }
    };
    
    document.getElementById("m_subscribe").onclick = () => {
        if (window.navigation?.showSubscribe) {
            window.navigation.showSubscribe(user);
        }
    };
    
    document.getElementById("m_settings").onclick = () => {
        if (window.navigation?.showSettings) {
            window.navigation.showSettings(user);
        }
    };
    
    document.getElementById("btn_logout").onclick = () => {
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js")
            .then(({ signOut }) => signOut(auth));
    };

    // Активация ключа
    document.getElementById("btn_activate_key").onclick = async () => {
        const keyInput = document.getElementById("license_key_input").value.trim().toUpperCase();
        const resultDiv = document.getElementById("activation_result");
        
        if (!keyInput || keyInput.length !== 19) {
            showResult("❌ Введіть коректний ключ у форматі XXXX-XXXX-XXXX-XXXX", "error");
            return;
        }
        
        // Показываем загрузку
        document.getElementById("btn_activate_key").textContent = "⏳ Перевірка ключа...";
        document.getElementById("btn_activate_key").disabled = true;
        
        try {
            // Ищем ключ в базе данных
            const keysQuery = query(
                collection(db, "license_keys"), 
                where("key", "==", keyInput)
            );
            
            const keysSnapshot = await getDocs(keysQuery);
            
            if (keysSnapshot.empty) {
                showResult("❌ Ключ не знайдено. Перевірте правильність введення.", "error");
                return;
            }
            
            const keyDoc = keysSnapshot.docs[0];
            const keyData = keyDoc.data();
            
            // Проверяем статус ключа
            if (keyData.isUsed || keyData.usedBy) {
                showResult(`❌ Цей ключ вже використано користувачем: ${keyData.usedByEmail || keyData.usedBy}`, "error");
                return;
            }
            
            if (keyData.expiresAt && keyData.expiresAt < Date.now()) {
                showResult("❌ Термін дії ключа закінчився", "error");
                return;
            }
            
            if (keyData.status === "revoked" || keyData.isActive === false) {
                showResult("❌ Ключ деактивований адміністратором", "error");
                return;
            }
            
            // Активируем ключ
            const expiresAt = Date.now() + (keyData.days * 24 * 60 * 60 * 1000);
            
            // Обновляем ключ
            await updateDoc(doc(db, "license_keys", keyDoc.id), {
                isUsed: true,
                usedBy: user.email,
                usedByEmail: user.email,
                usedById: user.uid,
                usedAt: Date.now(),
                status: "used"
            });
            
            // Обновляем пользователя
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            let newExpiresAt = expiresAt;
            
            if (userDocSnap.exists()) {
                const currentUserData = userDocSnap.data();
                
                // Если уже есть PRO подписка, добавляем дни
                if (currentUserData.plan === "pro" && currentUserData.expiresAt > Date.now()) {
                    newExpiresAt = currentUserData.expiresAt + (keyData.days * 24 * 60 * 60 * 1000);
                }
                
                await updateDoc(userDocRef, {
                    plan: "pro",
                    expiresAt: newExpiresAt,
                    activatedWithKey: keyInput,
                    keyActivatedAt: Date.now(),
                    updatedAt: Date.now()
                });
            } else {
                await updateDoc(userDocRef, {
                    plan: "pro",
                    expiresAt: newExpiresAt,
                    activatedWithKey: keyInput,
                    keyActivatedAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
            
            // Добавляем запись в логи
            await addDoc(collection(db, "logs"), {
                timestamp: Date.now(),
                level: "success",
                source: "Активація ключа",
                message: `Користувач ${user.email} активував ключ ${keyInput} на ${keyData.days} днів`,
                userEmail: user.email,
                userId: user.uid,
                action: "activate_key",
                key: keyInput,
                days: keyData.days
            });
            
            // Показываем успех
            const successMessage = `
                <div style="background: rgba(16,185,129,0.2); padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                    <h3 style="margin: 0 0 10px 0; color: #10b981;">Ключ успішно активовано!</h3>
                    <p style="color: var(--text-dim); margin-bottom: 15px;">
                        Ваш акаунт оновлено до PRO версії на <strong>${keyData.days} днів</strong>.
                    </p>
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-top: 15px;">
                        <div style="font-family: monospace; font-weight: bold; font-size: 16px;">${keyInput}</div>
                        <div style="font-size: 12px; color: var(--text-dim); margin-top: 5px;">
                            Тип: ${keyData.type === 'pro' ? 'PRO підписка' : (keyData.type === 'admin' ? 'Адмін права' : 'Пробний період')}
                        </div>
                    </div>
                    <p style="margin-top: 15px; font-size: 14px;">
                        PRO підписка активна до: <strong>${new Date(newExpiresAt).toLocaleDateString('uk-UA')}</strong>
                    </p>
                </div>
            `;
            
            showResult(successMessage, "success");
            
            // Обновляем кнопку
            document.getElementById("btn_activate_key").textContent = "✅ Активовано!";
            
            // Через 3 секунды перезагружаем страницу
            setTimeout(() => {
                renderActivateKey(user, auth, db, onBack);
            }, 3000);
            
        } catch (error) {
            console.error("Помилка активації ключа:", error);
            showResult(`❌ Помилка активації: ${error.message}`, "error");
            document.getElementById("btn_activate_key").textContent = "✅ Активувати ключ";
            document.getElementById("btn_activate_key").disabled = false;
        }
    };
    
    function showResult(message, type) {
        const resultDiv = document.getElementById("activation_result");
        resultDiv.innerHTML = message;
        resultDiv.style.display = "block";
        
        if (type === "error") {
            resultDiv.style.background = "rgba(239,68,68,0.2)";
            resultDiv.style.border = "1px solid rgba(239,68,68,0.3)";
            resultDiv.style.color = "#ef4444";
        } else if (type === "success") {
            resultDiv.style.background = "rgba(16,185,129,0.2)";
            resultDiv.style.border = "1px solid rgba(16,185,129,0.3)";
        }
        
        // Сбрасываем кнопку если ошибка
        if (type === "error") {
            document.getElementById("btn_activate_key").textContent = "✅ Активувати ключ";
            document.getElementById("btn_activate_key").disabled = false;
        }
    }
}