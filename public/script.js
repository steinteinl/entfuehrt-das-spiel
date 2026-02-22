// public/script.js - Die interaktive Logik im Browser
// ====================================================

// --- Spielstand (wird vom Server aktualisiert) ---
let spielstand = {
    schwierigkeit: null,
    geschichte: null,
    charakter: {
        name: '',
        alter: null,
        persönlichkeit: '',
        spezialfähigkeit: {
            name: '',
            erhalten: false,
            eingesetzt: false
        }
    },
    hinweise: [],
    gegenstände: []
};

// --- DOM-Elemente ---
const charakterErstellung = document.getElementById('charakter-erstellung');
const spielScreen = document.getElementById('spiel');
const spielausgabe = document.getElementById('spielausgabe');
const befehlInput = document.getElementById('befehl');
const sendenBtn = document.getElementById('senden-btn');
const startBtn = document.getElementById('start-game');
const inventarBtn = document.getElementById('inventar-btn');
const inventarOverlay = document.getElementById('inventar-overlay');
const inventarInhalt = document.getElementById('inventar-inhalt');
const inventarSchliessen = document.getElementById('inventar-schliessen');
const charakterInfo = document.getElementById('charakter-info');
// --- Neue Buttons für Speichern/Laden ---
const speichernBtn = document.getElementById('speichern-btn');
const ladenBtn = document.getElementById('laden-btn');

// --- Charaktererstellung starten ---
startBtn.addEventListener('click', async () => {
    // Daten aus Formular sammeln
    const name = document.getElementById('name').value.trim();
    const alter = parseInt(document.getElementById('alter').value);
    const persönlichkeit = document.getElementById('persoenlichkeit').value.trim();
    const geschichte = document.getElementById('geschichte').value;
    const schwierigkeit = document.getElementById('schwierigkeit').value;
    const faehigkeitWunsch = document.getElementById('faehigkeit').value.trim();
    const seltenheit = parseInt(document.getElementById('seltenheit').value);

    // Validierung
    if (!name || !persönlichkeit) {
        alert('Bitte fülle alle Felder aus!');
        return;
    }

    // Würfeln für Spezialfähigkeit
    let faehigkeitErhalten = false;
    let wuerfelErgebnis = 0;
    
    switch(seltenheit) {
        case 1:
            wuerfelErgebnis = Math.floor(Math.random() * 100) + 1;
            faehigkeitErhalten = wuerfelErgebnis <= 90;
            break;
        case 2:
            wuerfelErgebnis = Math.floor(Math.random() * 100) + 1;
            faehigkeitErhalten = wuerfelErgebnis <= 50;
            break;
        case 3:
            wuerfelErgebnis = Math.floor(Math.random() * 100) + 1;
            faehigkeitErhalten = wuerfelErgebnis <= 10;
            break;
        case 4:
            wuerfelErgebnis = Math.floor(Math.random() * 1000) + 1;
            faehigkeitErhalten = wuerfelErgebnis <= 1;
            break;
    }

    // Spielstand initialisieren
    spielstand = {
        schwierigkeit: schwierigkeit,
        geschichte: geschichte,
        charakter: {
            name: name,
            alter: alter,
            persönlichkeit: persönlichkeit,
            spezialfähigkeit: {
                name: faehigkeitWunsch || 'keine',
                erhalten: faehigkeitErhalten && faehigkeitWunsch,
                eingesetzt: false
            }
        },
        hinweise: [],
        gegenstände: []
    };

    // Charakterinfo im Header anzeigen
    charakterInfo.innerHTML = `
        <strong>${name}</strong>, ${alter} Jahre<br>
        <small>${persönlichkeit}</small>
    `;

    // Zur Spielansicht wechseln
    charakterErstellung.classList.remove('active');
    spielScreen.classList.add('active');

    // Start-Text anzeigen
    spielausgabe.innerHTML = `
        <p class="story-text">=== Willkommen, ${name}! ===</p>
        <p class="story-text">${holeEinleitung(geschichte)}</p>
        <p class="story-text system-nachricht">Was tust du?</p>
    `;

    // Würfelergebnis für Fähigkeit anzeigen
    if (faehigkeitWunsch) {
        const faehigkeitText = faehigkeitErhalten 
            ? `✨ Du hast die Fähigkeit '${faehigkeitWunsch}' erhalten! (Wurf: ${wuerfelErgebnis})`
            : `❌ Du hast die Fähigkeit '${faehigkeitWunsch}' nicht erhalten. (Wurf: ${wuerfelErgebnis})`;
        
        spielausgabe.innerHTML += `<p class="story-text system-nachricht">${faehigkeitText}</p>`;
    }
});

// --- Einleitungstext je nach Geschichte ---
function holeEinleitung(geschichte) {
    switch(geschichte) {
        case 'Entführt – Die Suche nach meinen Eltern':
            return 'Du kommst nach Hause. Die Tür ist aufgebrochen. Alles durchwühlt. Auf dem Tisch liegt ein Zettel: "Deine Eltern sind jetzt bei uns. Finde sie – wenn du kannst."';
        case 'Das verfluchte Anwesen':
            return 'Nebel kriecht vom Meer herauf. Blackwood Manor ist unheimlich still. Deine Eltern sind verschwunden. Die Dorfbewohner flüstern von einem Fluch.';
        case 'Die letzte Kolonie – Signalverlust':
            return 'Die Forschungsstation ist still. Kein Kontakt zur Erde. Deine Eltern sind weg. Die Luftschleuse steht offen. Auf dem Monitor blinkt: "Sie haben uns gefunden. Versteck dich."';
        default:
            return 'Das Spiel beginnt...';
    }
}

// --- Aktion an Server senden ---
async function sendeAktion() {
    const aktion = befehlInput.value.trim();
    if (!aktion) return;

    // Eingabefeld leeren
    befehlInput.value = '';

    // Spielereingabe anzeigen
    spielausgabe.innerHTML += `<p class="spieler-eingabe">> ${aktion}</p>`;

    // "Denkt nach" Animation
    const denkElement = document.createElement('p');
    denkElement.className = 'story-text system-nachricht';
    denkElement.innerHTML = '🎲 Die KI denkt nach<span class="denk-animation"></span>';
    spielausgabe.appendChild(denkElement);
    spielausgabe.scrollTop = spielausgabe.scrollHeight;

    try {
        // Anfrage an Server
        const response = await fetch('/api/aktion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                aktion: aktion,
                spielstand: spielstand
            })
        });

        const data = await response.json();

        // Denk-Nachricht entfernen
        denkElement.remove();

        // KI-Antwort anzeigen (mit Erfolg-Text-Farbe)
        spielausgabe.innerHTML += `<p class="story-text erfolg-text">✨ ${data.antwort}</p>`;

        // Spielstand aktualisieren (falls sich was geändert hat)
        if (data.neuerSpielstand) {
            spielstand = data.neuerSpielstand;
        }

    } catch (error) {
        denkElement.remove();
        spielausgabe.innerHTML += `<p class="story-text misserfolg-text">❌ Fehler: Die KI ist nicht erreichbar.</p>`;
    }

    // Nach unten scrollen
    spielausgabe.scrollTop = spielausgabe.scrollHeight;
}

// --- SPIELSTAND SPEICHERN ---
function spielStandSpeichern() {
    try {
        // Konvertiere Spielstand in JSON-String
        const spielString = JSON.stringify(spielstand);
        
        // Speichere im Browser
        localStorage.setItem('entfuehrt_save', spielString);
        
        // Kurze Rückmeldung
        spielausgabe.innerHTML += `<p class="story-text system-nachricht">💾 Spielstand gespeichert!</p>`;
        spielausgabe.scrollTop = spielausgabe.scrollHeight;
        
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        spielausgabe.innerHTML += `<p class="story-text misserfolg-text">❌ Fehler beim Speichern!</p>`;
        spielausgabe.scrollTop = spielausgabe.scrollHeight;
        return false;
    }
}

// --- SPIELSTAND LADEN ---
function spielStandLaden() {
    try {
        // Hole gespeicherten String
        const spielString = localStorage.getItem('entfuehrt_save');
        
        if (!spielString) {
            spielausgabe.innerHTML += `<p class="story-text system-nachricht">❌ Kein gespeicherter Spielstand gefunden.</p>`;
            spielausgabe.scrollTop = spielausgabe.scrollHeight;
            return false;
        }
        
        // Zurück in Objekt verwandeln
        const geladenerStand = JSON.parse(spielString);
        
        // Spielstand aktualisieren
        spielstand = geladenerStand;
        
        // Charakterinfo im Header aktualisieren
        charakterInfo.innerHTML = `
            <strong>${spielstand.charakter.name}</strong>, ${spielstand.charakter.alter} Jahre<br>
            <small>${spielstand.charakter.persönlichkeit}</small>
        `;
        
        spielausgabe.innerHTML += `<p class="story-text system-nachricht">✅ Spielstand geladen! Willkommen zurück, ${spielstand.charakter.name}.</p>`;
        spielausgabe.scrollTop = spielausgabe.scrollHeight;
        
        return true;
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        spielausgabe.innerHTML += `<p class="story-text misserfolg-text">❌ Fehler beim Laden des Spielstands.</p>`;
        spielausgabe.scrollTop = spielausgabe.scrollHeight;
        return false;
    }
}

// --- Event-Listener für Buttons ---
speichernBtn.addEventListener('click', spielStandSpeichern);
ladenBtn.addEventListener('click', spielStandLaden);

// --- Enter-Taste im Eingabefeld ---
befehlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendeAktion();
    }
});

// --- Senden-Button ---
sendenBtn.addEventListener('click', sendeAktion);

// --- Inventar anzeigen ---
inventarBtn.addEventListener('click', () => {
    let inventarText = '';
    
    if (spielstand.hinweise.length > 0) {
        inventarText += '<strong>🔍 Hinweise:</strong><br>';
        spielstand.hinweise.forEach(hinweis => {
            inventarText += `• ${hinweis}<br>`;
        });
    } else {
        inventarText += '<strong>🔍 Hinweise:</strong> keine<br>';
    }

    if (spielstand.gegenstände.length > 0) {
        inventarText += '<br><strong>📦 Gegenstände:</strong><br>';
        spielstand.gegenstände.forEach(gegenstand => {
            inventarText += `• ${gegenstand}<br>`;
        });
    } else {
        inventarText += '<br><strong>📦 Gegenstände:</strong> keine<br>';
    }

    if (spielstand.charakter.spezialfähigkeit.erhalten) {
        const status = spielstand.charakter.spezialfähigkeit.eingesetzt 
            ? '(bereits eingesetzt)' 
            : '(noch verfügbar)';
        inventarText += `<br><strong>✨ Spezialfähigkeit:</strong> ${spielstand.charakter.spezialfähigkeit.name} ${status}`;
    }

    inventarInhalt.innerHTML = inventarText;
    inventarOverlay.classList.add('active');
});

// --- Inventar schließen ---
inventarSchliessen.addEventListener('click', () => {
    inventarOverlay.classList.remove('active');
});

// --- Overlay mit Escape-Taste schließen ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && inventarOverlay.classList.contains('active')) {
        inventarOverlay.classList.remove('active');
    }
});