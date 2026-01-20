// Создайте navigation.js или используйте существующий файл
export class Navigation {
    constructor(user, auth, db) {
        this.user = user;
        this.auth = auth;
        this.db = db;
    }

    async toProfile() {
        const { renderProfile } = await import('./profile.js');
        renderProfile(this.user, this.auth, this.db, 
            () => this.toVault(),
            () => this.toSettings()
        );
    }

    async toVault() {
        const { renderVault } = await import('./vault.js');
        renderVault(this.user, this.auth, this.db,
            () => this.toProfile(),
            () => this.toSettings()
        );
    }

    async toSettings() {
        const { renderSettings } = await import('./settings.js');
        renderSettings(this.user, this.auth, this.db,
            () => this.toProfile(),
            () => this.toVault()
        );
    }
}

// Использование в profile.js:
document.getElementById("m_vault").onclick = () => navigation.toVault();
document.getElementById("m_settings").onclick = () => navigation.toSettings();