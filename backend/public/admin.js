document.getElementById('generateBtn').addEventListener('click', async (e) => {
    const btn = e.target;
    const toast = document.getElementById('toast');

    if (!confirm('This will reset all matches and generate a new tournament for 33 players. Continue?')) return;

    btn.disabled = true;
    btn.innerText = 'Generating...';

    try {
        const response = await fetch('/api/generate-tournament', {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            toast.innerText = 'Tournament Generated Successfully!';
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                window.location.href = 'tournament.html';
            }, 2000);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to connect to server');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Generate Tournament (33 Players)';
    }
});

// Fetch participants
async function fetchParticipants() {
    const participantList = document.getElementById('participantList');
    try {
        const response = await fetch('/api/participants');
        const participants = await response.json();

        if (participants.length === 0) {
            participantList.innerHTML = 'No participants registered yet.';
            return;
        }

        participantList.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="text-align: left; border-bottom: 1px solid var(--border-color);">
                        <th style="padding: 1rem;">Reg #</th>
                        <th style="padding: 1rem;">Name</th>
                        <th style="padding: 1rem;">Category</th>
                        <th style="padding: 1rem;">Phone</th>
                        <th style="padding: 1rem;">Email</th>
                        <th style="padding: 1rem;">Team</th>
                    </tr>
                </thead>
                <tbody>
                    ${participants.map(p => `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem;">${p.regNo || '-'}</td>
                            <td style="padding: 1rem;">${p.name}</td>
                            <td style="padding: 1rem;">${p.category || '-'}</td>
                            <td style="padding: 1rem;">${p.phone || '-'}</td>
                            <td style="padding: 1rem;">${p.email}</td>
                            <td style="padding: 1rem;">${p.teamName || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error(err);
        participantList.innerHTML = 'Failed to load participants.';
    }
}

fetchParticipants();
