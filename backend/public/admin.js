document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const participantList = document.getElementById('participantList');
    const activeMatches = document.getElementById('activeMatches');
    const categoryFilter = document.getElementById('categoryFilter');
    const toast = document.getElementById('toast');
    const token = localStorage.getItem('adminToken');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    async function fetchData() {
        await fetchParticipants();
        await fetchMatches();
    }

    async function fetchParticipants() {
        try {
            const res = await fetch('/api/participants');
            const data = await res.json();
            participantList.innerHTML = data.map(p => `
                <div style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
                    <span style="color: var(--accent-color);">#${p.regNo || '?'}</span> 
                    <strong>${p.name}</strong> 
                    <span style="color: var(--text-dim); font-size: 0.8rem;">(${p.category})</span>
                </div>
            `).join('') || 'No participants found.';
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchMatches() {
        const category = categoryFilter.value;
        try {
            const res = await fetch(`/api/schedule?category=${encodeURIComponent(category)}`);
            const matches = await res.json();
            
            // Only show matches that aren't completed or are currently live
            activeMatches.innerHTML = matches.filter(m => !m.isBye).map(m => `
                <div class="match-item">
                    <div class="header">
                        <span>MATCH #${m.matchIndex} • ROUND ${m.round}</span>
                        <span style="color: ${m.isCompleted ? '#4caf50' : '#ff9800'}">${m.status.toUpperCase()}</span>
                    </div>
                    <div class="score-input-group">
                        <span class="player-name-admin">${m.player1 || 'TBD'}</span>
                        <input type="number" class="score-input" id="s1-${m._id}" value="${m.score1 || 0}" ${m.isCompleted ? 'disabled' : ''}>
                    </div>
                    <div class="score-input-group">
                        <span class="player-name-admin">${m.player2 || 'TBD'}</span>
                        <input type="number" class="score-input" id="s2-${m._id}" value="${m.score2 || 0}" ${m.isCompleted ? 'disabled' : ''}>
                    </div>
                    ${!m.isCompleted ? `
                        <div class="actions">
                            <button class="btn btn-primary btn-small" onclick="updateScore('${m._id}')">Update Score</button>
                            <button class="btn btn-small" style="background: #4caf50;" onclick="completeMatch('${m._id}')">Complete & Advance</button>
                        </div>
                    ` : '<div style="font-size: 0.8rem; color: #4caf50; text-align: center;">✓ Match Finished</div>'}
                </div>
            `).join('') || 'No matches found.';
        } catch (err) {
            console.error(err);
        }
    }

    window.updateScore = async (id) => {
        const s1 = document.getElementById(`s1-${id}`).value;
        const s2 = document.getElementById(`s2-${id}`).value;
        try {
            const res = await fetch(`/api/matches/${id}/score`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ score1: s1, score2: s2, status: 'live' })
            });
            if (res.ok) {
                showToast('Score Updated!');
                fetchMatches();
            }
        } catch (err) {
            console.error(err);
        }
    };

    window.completeMatch = async (id) => {
        const s1 = parseInt(document.getElementById(`s1-${id}`).value);
        const s2 = parseInt(document.getElementById(`s2-${id}`).value);
        
        // Find winner based on score
        const matchItem = document.querySelector(`.match-item [id="s1-${id}"]`).closest('.match-item');
        const p1 = matchItem.querySelectorAll('.player-name-admin')[0].innerText;
        const p2 = matchItem.querySelectorAll('.player-name-admin')[1].innerText;
        
        if (p1 === 'TBD' || p2 === 'TBD') {
            alert('Cannot complete a match with TBD players.');
            return;
        }

        const winner = s1 > s2 ? p1 : p2;
        if (!confirm(`Mark ${winner} as the winner with score ${s1}-${s2}?`)) return;

        try {
            const res = await fetch(`/api/matches/${id}/complete`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ winner, score1: s1, score2: s2 })
            });
            if (res.ok) {
                showToast('Match Completed & Winner Advanced!');
                fetchMatches();
            }
        } catch (err) {
            console.error(err);
        }
    };

    generateBtn.addEventListener('click', async () => {
        if (!confirm('RESET ALL MATCHES and generate a new tournament?')) return;
        generateBtn.disabled = true;
        try {
            const res = await fetch('/api/generate-tournament', { method: 'POST', headers });
            if (res.ok) {
                showToast('Tournament Reset & Generated!');
                fetchData();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            generateBtn.disabled = false;
        }
    });

    categoryFilter.addEventListener('change', fetchMatches);

    function showToast(msg) {
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    fetchData();
});
