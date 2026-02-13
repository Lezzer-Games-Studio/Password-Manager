import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Функція для генерації випадкового секретного ключа (Base32)
function generateSecret(length = 16) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < length; i++) {
        secret += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return secret;
}

export async function render2FASettings(user, db) {
    const mainContent = document.querySelector(".main-content");
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const isEnabled = userData?.twoFactorEnabled || false;

    mainContent.innerHTML = `
    <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
        <h1 style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 30px;">🛡️</span> 2FA Захист
        </h1>
        <p style="color: var(--text-dim); line-height: 1.6;">
            Двофакторна автентифікація додає додатковий рівень безпеки. Навіть якщо хтось дізнається ваш пароль, він не зможе увійти в сейф без коду з вашого телефону.
        </p>

        <div class="glass-card" style="padding: 30px; margin-top: 20px; border: 1px solid ${isEnabled ? '#22c55e' : 'var(--border)'}; border-radius: 16px; background: rgba(30, 41, 59, 0.4);">
            <div id="status_area" style="text-align: center;">
                <h3 style="margin-bottom: 20px;">Статус: ${isEnabled ? '<span style="color:#22c55e">Увімкнено</span>' : '<span style="color:#ef4444">Вимкнено</span>'}</h3>
                ${isEnabled ? 
                    `<button id="btn_disable_2fa" style="padding: 12px 20px; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid #ef4444; border-radius: 10px; cursor: pointer;">Вимкнути захист</button>` : 
                    `<button id="btn_start_2fa" style="padding: 12px 30px; background: var(--accent); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">Налаштувати 2FA</button>`
                }
            </div>

            <div id="setup_area" style="display: none; margin-top: 20px; text-align: center;">
                <p style="font-size: 14px; margin-bottom: 15px;">1. Відскануйте QR-код у додатку <b>Google Authenticator</b></p>
                <div id="qrcode_container" style="background: white; padding: 15px; display: inline-block; border-radius: 10px;">
                    <img id="qr_img" src="" style="display: block;">
                </div>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 10px;">Або введіть ключ вручну: <br><b id="secret_display" style="color: var(--accent); letter-spacing: 1px;"></b></p>
                
                <hr style="border: 0; border-top: 1px solid var(--border); margin: 20px 0;">
                
                <p style="font-size: 14px; margin-bottom: 10px;">2. Введіть 6-значний код для підтвердження:</p>
                <input type="text" id="otp_code" placeholder="000000" maxlength="6" 
                    style="width: 100%; padding: 12px; text-align: center; font-size: 20px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 8px; color: white; margin-bottom: 15px;">
                
                <button id="btn_save_2fa" style="width: 100%; padding: 12px; background: #22c55e; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">Увімкнути</button>
                <button id="btn_cancel_2fa" style="width: 100%; margin-top: 10px; background: none; border: none; color: var(--text-dim); cursor: pointer;">Скасувати</button>
            </div>
        </div>
    </div>
    `;

    // ЛОГІКА
    const startBtn = document.getElementById('btn_start_2fa');
    const setupArea = document.getElementById('setup_area');
    const statusArea = document.getElementById('status_area');
    const secretDisplay = document.getElementById('secret_display');
    const qrImg = document.getElementById('qr_img');
    
    let tempSecret = "";

    if (startBtn) {
        startBtn.onclick = () => {
            tempSecret = generateSecret();
            const issuer = "VaultSafe";
            const account = user.email;
            // Генеруємо посилання для QR-коду (використовуємо Google Chart API для простоти)
            const otpauth = `otpauth://totp/${issuer}:${account}?secret=${tempSecret}&issuer=${issuer}`;
            qrImg.src = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(otpauth)}&choe=UTF-8`;
            
            secretDisplay.innerText = tempSecret;
            statusArea.style.display = 'none';
            setupArea.style.display = 'block';
        };
    }

    // Скасування
    const cancelBtn = document.getElementById('btn_cancel_2fa');
    if(cancelBtn) cancelBtn.onclick = () => location.reload();

    // Збереження в Firebase
    document.getElementById('btn_save_2fa')?.addEventListener('click', async () => {
        const code = document.getElementById('otp_code').value;
        if (code.length < 6) return alert("Введіть 6-значний код");

        // У реальному житті тут має бути бібліотека для перевірки TOTP (otplib), 
        // але для цього клієнтського прототипу ми просто активуємо ключ.
        try {
            await updateDoc(userRef, {
                twoFactorEnabled: true,
                twoFactorSecret: tempSecret
            });
            alert("✅ 2FA успішно активовано!");
            location.reload();
        } catch (e) {
            alert("Помилка при збереженні");
        }
    });

    // Вимкнення
    document.getElementById('btn_disable_2fa')?.addEventListener('click', async () => {
        if (!confirm("Ви впевнені? Це знизить безпеку вашого сейфа.")) return;
        await updateDoc(userRef, {
            twoFactorEnabled: false,
            twoFactorSecret: null
        });
        location.reload();
    });
}