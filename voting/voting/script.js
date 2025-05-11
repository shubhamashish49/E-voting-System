// Constants
const PRIME = 101;
const VALID_EPIC_NUMBERS = ["1234", "6789","432","32","42","45","23"];
const PASSWORD = "Sai@17";

// Track party votes and voting status
const partyVotes = JSON.parse(localStorage.getItem("partyVotes")) || {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
};
const voteStatus = JSON.parse(localStorage.getItem("voteStatus")) || {}; // Stores if a user has voted

// Login Function
function login() {
    const epicNumber = document.getElementById("epicNumber").value;
    if (VALID_EPIC_NUMBERS.includes(epicNumber)) {
        if (voteStatus[epicNumber]) {
            alert("You have already voted. Multiple votes are not allowed.");
            return;
        }
        localStorage.setItem("epicNumber", epicNumber);
        alert("Login successful!");
        window.location.href = "vote.html";
    } else {
        alert("Invalid EPIC number. Please enter Valid EPIC Number");
    }
}

// Shamir's Secret Sharing
function generatePolynomial(secret, degree) {
    const coefficients = [secret];
    for (let i = 1; i <= degree; i++) {
        coefficients.push(Math.floor(Math.random() * PRIME));
    }
    return coefficients;
}

function evaluatePolynomial(coeffs, x) {
    return coeffs.reduce((acc, coeff, index) => (acc + coeff * Math.pow(x, index)) % PRIME, 0);
}

function generateShares(secret, numShares, threshold) {
    const polynomial = generatePolynomial(secret, threshold - 1);
    const shares = Array.from({ length: numShares }, (_, i) => {
        return { x: i + 1, y: evaluatePolynomial(polynomial, i + 1) };
    });
    return { polynomial, shares };
}
function reconstructSecret(shares) {
    let secret = 0;
    for (let i = 0; i < shares.length; i++) {
        let { x, y } = shares[i];
        let numerator = 1;
        let denominator = 1;
        for (let j = 0; j < shares.length; j++) {
            if (i !== j) {
                numerator = (numerator * -shares[j].x) % PRIME;
                denominator = (denominator * (shares[i].x - shares[j].x)) % PRIME;
            }
        }
        secret = (secret + y * numerator * modInverse(denominator, PRIME)) % PRIME;
    }
    return secret;
}

function modInverse(a, m) {
    let m0 = m, t, q;
    let x0 = 0, x1 = 1;
    if (m == 1) return 0;
    while (a > 1) {
        q = Math.floor(a / m);
        t = m;
        m = a % m;
        a = t;
        t = x0;
        x0 = x1 - q * x0;
        x1 = t;
    }
    if (x1 < 0) x1 += m0;
    return x1;
}


// Cast Vote
function castVote() {
    const epicNumber = localStorage.getItem("epicNumber");
    if (voteStatus[epicNumber]) {
        alert("You have already voted. Multiple votes are not allowed.");
        return;
    }

    const selectedParty = parseInt(document.getElementById("partySelect").value);
    const { polynomial, shares } = generateShares(selectedParty, 5, 3);

    // Nonce generation for vote verification
    const nonce = Math.random().toString(36).substring(2, 15); // Random nonce for uniqueness

    // Save share and nonce data for later verification and download
    const voteData = {
        epicNumber,
        selectedParty,
        polynomial,
        shares,
        nonce
    };

    // Store voteData into storedVotes in localStorage
    const storedVotes = JSON.parse(localStorage.getItem("storedVotes")) || [];
    storedVotes.push(voteData);
    localStorage.setItem("storedVotes", JSON.stringify(storedVotes));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(voteData));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vote_data_${epicNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    // Update party votes and status
    partyVotes[selectedParty] = (partyVotes[selectedParty] || 0) + 1;
    localStorage.setItem("partyVotes", JSON.stringify(partyVotes));
    voteStatus[epicNumber] = true;
    localStorage.setItem("voteStatus", JSON.stringify(voteStatus));

    alert("Vote cast successfully!");
}

function submitShares() {
    const shareInputs = [document.getElementById("share1"), document.getElementById("share2"), document.getElementById("share3")];
    const shares = [];

    for (const input of shareInputs) {
        const [x, y] = input.value.split(",").map(Number);
        if (isNaN(x) || isNaN(y)) {
            alert("Please enter valid share values in the format 'x,y'.");
            return;
        }
        shares.push({ x, y });
    }

    const reconstructedVote = reconstructSecret(shares);
    const epicNumber = localStorage.getItem("epicNumber");
    const partyNames = ["Biju Janata Dal (BJD)", "Bharatiya Janata Party (BJP)", "Indian National Congress (INC)", "Communist Party of India (CPI)", "NOTA"];
    const partyName = partyNames[reconstructedVote - 1];

    document.getElementById("verifyOutput").innerHTML = `<h3>Verification</h3>
        <p>EPIC Number: ${epicNumber}</p>
        <p>Voted for: ${partyName}</p>`;
}

function promptPasswordForVerification() {
    const password = prompt("Enter password to verify your vote:");
    if (password === PASSWORD) {
        document.getElementById("shareInputContainer").style.display = "block";
    } else {
        alert("Incorrect password!");
    }
}

function submitVerification() {
    const share1 = document.getElementById("share1").value;
    const share2 = document.getElementById("share2").value;
    const share3 = document.getElementById("share3").value;
    const nonce = document.getElementById("nonce").value.trim();

    // Check if shares are provided
    if (share1 && share2 && share3) {
        const shares = [share1, share2, share3].map(input => {
            const [x, y] = input.split(",").map(Number);
            if (isNaN(x) || isNaN(y)) {
                alert("Please enter valid share values in the format 'x,y'.");
                return null;
            }
            return { x, y };
        });

        if (shares.includes(null)) return;  // Exit if invalid input

        // Reconstruct the vote using the shares
        const reconstructedVote = reconstructSecret(shares);
        displayVoteVerification(reconstructedVote);

    } else if (nonce) {
        // If nonce is provided, retrieve the vote data stored with this nonce
        const storedVotes = JSON.parse(localStorage.getItem("storedVotes"));
        const voteData = storedVotes.find(data => data.nonce === nonce);

        if (voteData) {
            displayVoteVerification(voteData.selectedParty);
        } else {
            alert("Invalid nonce. No matching vote found.");
        }
    } else {
        alert("Please enter either three shares or a nonce for verification.");
    }
}

// Display the verification results based on the selected party
function displayVoteVerification(vote) {
    const epicNumber = localStorage.getItem("epicNumber");
    const partyNames = ["Biju Janata Dal (BJD)", "Bharatiya Janata Party (BJP)", "Indian National Congress (INC)", "Communist Party of India (CPI)", "NOTA"];

    // Ensure vote is within the valid range of party numbers
    if (vote >= 1 && vote <= partyNames.length) {
        const partyName = partyNames[vote - 1];
        document.getElementById("verifyOutput").innerHTML = `<h3>Verification</h3>
            <p>EPIC Number: ${epicNumber}</p>
            <p>Voted for: ${partyName}</p>`;
    } else {
        // Handle case where vote is invalid (should not happen with valid shares)
        document.getElementById("verifyOutput").innerHTML = `<h3>Verification</h3>
            <p>EPIC Number: ${epicNumber}</p>
            <p>Invalid Vote</p>`;
    }
}



// Verify Vote
function verifyVote() {
    const epicNumber = localStorage.getItem("epicNumber");
    const voteData = JSON.parse(localStorage.getItem("shares"));
    const reconstructedVote = reconstructSecret(voteData.shares.slice(0, 3));

    const partyNames = ["Biju Janata Dal (BJD)", "Bharatiya Janata Party (BJP)", "Indian National Congress (INC)", "Communist Party of India (CPI)", "NOTA"];
    const partyName = partyNames[reconstructedVote - 1];
    document.getElementById("verifyOutput").innerHTML = `<h3>Verification</h3>
        <p>EPIC Number: ${epicNumber}</p>
        <p>Voted for: ${partyName}</p>`;
}
function promptPasswordAndShowResults() {
    const password = prompt("Enter password to view results:");
    if (password === PASSWORD) {
        displayResults();
    } else {
        alert("Incorrect password!");
    }
}


// Display Results
function displayResults() {
    const storedVotes = JSON.parse(localStorage.getItem("partyVotes")) || partyVotes;
    const partyNames = ["Biju Janata Dal (BJD)", "Bharatiya Janata Party (BJP)", "Indian National Congress (INC)", "Communist Party of India (CPI)", "NOTA"];
    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = "<h3>Results:</h3>";

    partyNames.forEach((party, index) => {
        const votes = storedVotes[index + 1] || 0;
        resultsContainer.innerHTML += `<p>${party}: ${votes} votes</p>`;
    });
}


// Initialize localStorage if not present
if (!localStorage.getItem("partyVotes")) {
    localStorage.setItem("partyVotes", JSON.stringify(partyVotes));
}
if (!localStorage.getItem("voteStatus")) {
    localStorage.setItem("voteStatus", JSON.stringify(voteStatus));
}
