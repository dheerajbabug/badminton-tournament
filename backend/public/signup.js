document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }) // No adminSecret for normal user
        });

        const data = await response.json();

        if (response.ok) {
            // After successful signup, redirect to login page
            window.location.href = 'login.html';
        } else {
            errorMsg.innerText = data.error || 'Signup failed';
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        errorMsg.innerText = 'Server error. Please try again.';
        errorMsg.style.display = 'block';
    }
});
