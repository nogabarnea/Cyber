async function loadPasswords() {
    try {
        const response = await fetch( "/api/passwords");
        const passwords = await response.json();
        displayPasswords(passwords);
    } catch (error) {
        console.error("Error loading passwords:", error);
        displayPasswords([]);
    }
}

async function addPassword() {
    let service = document.getElementById("service").value.trim();
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;
    if (!service || !username || !password) {
        alert("Please fill in all fields!");
        return;
    }
    try {
        const response = await fetch("/api/passwords", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                service: service,
                username: username,
                password: password
            })
        });
        const result = await response.json();
        if (result.success) {
            // Clear passwords and reload
            document.getElementById("add-form").reset();
            loadPasswords();
            alert("Password saved");
        } else {
            alert("Error: Failed to save");
        }
    } catch (error) {
        alert("Error connecting to server");
    }
}

async function generatePassword() {
    try {
        const response = await fetch("/api/generate");
        const result = await response.json();
        document.getElementById("password").value = result.password;
        document.getElementById("password").type = "text";
        setTimeout(function() {
          document.getElementById("password").type = "password";
       }, 3000); // hide password after 3 seconds
    } catch (error) { // create password here if server fails
        let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
        }
        document.getElementById("password").value = password;
    }
}

/**
 * 
 * @param {Array} passwords // array of object in the form of json {id, service, username, password}
 */
function displayPasswords(passwords) {
    let listContainer = document.getElementById("password-list");
        listContainer.innerHTML = ""; // cear existing list
        if (!passwords || passwords.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No passwords saved yet.</p>';
        return;
    }
        passwords.forEach(function(entry) {
        let itemHTML = createPasswordItemHTML(entry); // only building HTML here
        listContainer.innerHTML += itemHTML; 
    });
        addPasswordItemListeners();
}

/**
 * @param {Object} entry 
 * @returns {string}
 */
function createPasswordItemHTML(entry) {
    return `
        <div class="password-item" data-id="${entry.id}" data-encrypted="${escapeHTML(entry.password)}">
            <div class="service-name">${escapeHTML(entry.service)}</div>
            <div class="username">User: ${escapeHTML(entry.username)}</div>
            <div class="password-row">
                <input type="password" class="password-display" value="********" readonly>
                <div class="actions">
                    <button class="btn-secondary btn-small show-btn">Show</button>
                    <button class="btn-danger btn-small delete-btn">Delete</button>
                </div>
            </div>
        </div>
    `;
}


function addPasswordItemListeners() { //show/hide password buttons and delete buttons
    document.querySelectorAll(".show-btn").forEach(function(btn) {
        btn.addEventListener("click", async function() {
            let item = this.closest(".password-item"); //get the cdiv the button is in
            let passwordInput = item.querySelector(".password-display"); //get the input field inside that div
            if (passwordInput.type === "password") {
                //Get password (from the dots) and undot it
                let encrypted = item.dataset.encrypted;
                try {
                    const response = await fetch("/api/decrypt", { // decrypt password
                        method: "POST", // POST doesn't appear in the URL - safer then GET
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ encrypted: encrypted })
                    });
                    const result = await response.json();
                    passwordInput.value = result.decrypted; // show decrypted password
                    passwordInput.type = "text";
                    this.textContent = "Hide";
                } catch (error) {
                    console.error("Error decrypting:", error);
                    alert("Error decrypting password");
                }
            } else {
                passwordInput.value = "********";
                passwordInput.type = "password";
                this.textContent = "Show";
            }
        });
    });
    //delete password
    document.querySelectorAll(".delete-btn").forEach(function(btn) {
        btn.addEventListener("click", async function() {
            if (confirm("Are you sure you want to delete this password?")) {
                let item = this.closest(".password-item");
                let id = item.dataset.id;
                try {
                    await fetch("/api/passwords/" + id, {
                        method: "DELETE"
                    });     
                    loadPasswords();
                    alert("Password deleted!");
                } catch (error) {
                    console.error("Error deleting:", error);
                    alert("Error deleting password");
                }
            }
        });
    });
}

async function clearAll() {
    if (confirm("Are you sure you want to delete ALL passwords? This cannot be undone!")) {
        try {
            await fetch("/api/passwords", {
                method: "DELETE"
            });
            
            loadPasswords();
            alert("All passwords cleared!");
        } catch (error) {
            console.error("Error clearing:", error);
            alert("Error clearing passwords");
        }
    }
}

/**
 *
 * @param {string} text 
 * @returns {string}
 */
function escapeHTML(text) { // defense againt XSS
    if (!text) return "";
    let div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


loadPasswords(); // BEGGININGN
document.getElementById("add-form").addEventListener("submit", addPassword);
document.getElementById("generateButton").addEventListener("click", generatePassword);
document.getElementById("clearAllButton").addEventListener("click", clearAll);