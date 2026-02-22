// server.js - Das Backend für dein Web-Spiel
// ============================================

const express = require('express');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Wichtig: Damit JSON-Daten vom Frontend verarbeitet werden können
app.use(express.json());

// Statische Dateien aus dem public-Ordner bereitstellen
app.use(express.static('public'));

// --- Cloudflare Workers AI Client (gleicher Code wie in index.js) ---
const cloudflare = new OpenAI({
    apiKey: process.env.CLOUDFLARE_API_TOKEN,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`
});

const MODELL = '@cf/meta/llama-4-scout-17b-16e-instruct';

// --- Spiellogik als API-Endpunkt ---
app.post('/api/aktion', async (req, res) => {
    try {
        const { aktion, spielstand } = req.body;
        
        // Baue den Prompt (angepasst für Web)
        const prompt = `
Du bist der Spielleiter für ein düsteres Textadventure namens "ENTFÜHRT - Die Suche nach meinen Eltern".

AKTUELLER SPIELSTAND:
- Geschichte: ${spielstand.geschichte}
- Spieler: ${spielstand.charakter.name}, ${spielstand.charakter.alter} Jahre
- Persönlichkeit: ${spielstand.charakter.persönlichkeit}
- Schwierigkeitsgrad: ${spielstand.schwierigkeit}
- Bisherige Hinweise: ${spielstand.hinweise?.join(', ') || 'keine'}
- Bisherige Gegenstände: ${spielstand.gegenstände?.join(', ') || 'keine'}

WICHTIGE REGELN:
1. Der Spieler hat KEINE Kampferfahrung und ist verletzlich.
2. Du würfelst im Hintergrund mit einem W100 (1-100).

Der Spieler möchte folgende Aktion ausführen: "${aktion}"

Beschreibe lebendig und atmosphärisch, was passiert. Baue das Würfelergebnis in deine Beschreibung ein. Deine Antwort sollte 2-4 Sätze lang sein.
`;

        // KI-Anfrage an Cloudflare
        const response = await cloudflare.chat.completions.create({
            model: MODELL,
            messages: [
                { role: 'system', content: 'Du bist ein kreativer Spielleiter für Textadventures. Antworte auf Deutsch.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 500
        });

        const kiAntwort = response.choices[0].message.content;
        
        // Sende Antwort zurück an den Browser
        res.json({ 
            antwort: kiAntwort,
            neuerSpielstand: spielstand // Im Moment geben wir den gleichen Spielstand zurück
        });

    } catch (error) {
        console.error('Fehler:', error);
        res.status(500).json({ 
            antwort: 'Ein Fehler ist aufgetreten. Die KI ist gerade nicht erreichbar.',
            neuerSpielstand: req.body.spielstand
        });
    }
});

// --- HTML-Seite ausliefern ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Füge diese Zeilen in deine server.js ein (irgendwo vor app.listen)

// Health-Check-Endpoint für den Pinger
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Der Rest deiner server.js bleibt gleich!
app.listen(PORT, () => {
    console.log(`✅ Server läuft auf http://localhost:${PORT}`);
    console.log(`🌐 Öffne deinen Browser und gehe zu: http://localhost:${PORT}`);
});