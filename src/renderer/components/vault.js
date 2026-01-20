export function renderVault(root) {
  root.innerHTML = `
    <h2>My Vault</h2>
    <button id="addBtn">Add Password</button>
    <div id="list"></div>
  `;

  const list = document.getElementById('list');

  const passwords = [
    { title: 'Email', password: '12345' },
    { title: 'Facebook', password: 'qwerty' },
  ];

  passwords.forEach(p => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${p.title}</strong>: ${p.password} <button class="copy">Copy</button>`;
    div.querySelector('.copy').onclick = () => alert(`Copied ${p.password}`);
    list.appendChild(div);
  });

  document.getElementById('addBtn').onclick = () => alert('Add password clicked');
}
