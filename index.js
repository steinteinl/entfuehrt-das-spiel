// index.js - ENTFÜHRT mit Cloudflare Workers AI
// ============================================

// --- Pakete importieren ---
const readline = require('readline-sync');
const chalk = require('chalk');
const OpenAI = require('openai');
require('dotenv').config();

// --- Cloudflare Workers AI Client initialisieren ---
// Wichtig: Die Base-URL muss auf Cloudflare zeigen und deine Account-ID enthalten!
const cloudflare = new OpenAI({
    apiKey: process.env.CLOUDFLARE_API_TOKEN,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`
});

// --- Modell auswählen ---
// Llama 4 Scout ist kostenlos und ideal für kreative Textadventures
const MODELL = '@cf/meta/llama-4-scout-17b-16e-instruct';

// --- Grundlegende Spielvariablen ---
let spielstand = {
    schwierigkeit: null,
    geschichte: null,
    charakter: {
        name: '',
        alter: null,
        persönlichkeit: '',
        spezialfähigkeit: {
            name: '',
            wunsch: '',
            erhalten: false,
            eingesetzt: false
        }
    },
    hinweise: [],
    gegenstände: [],
    spielverlauf: []
};

// --- Hilfsfunktion für verdeckte Würfe ---
function wuerfeln(seiten = 100) {
    return Math.floor(Math.random() * seiten) + 1;
}

// --- Die KI-Spielleiter-Funktion für Cloudflare ---
async function kiSpielleiter(aktion) {
    try {
        // Baue den Prompt mit allen wichtigen Infos
        const prompt = `
Du bist der Spielleiter für ein düsteres Textadventure namens "ENTFÜHRT - Die Suche nach meinen Eltern".

AKTUELLER SPIELSTAND:
- Geschichte: ${spielstand.geschichte}
- Spieler: ${spielstand.charakter.name}, ${spielstand.charakter.alter} Jahre
- Persönlichkeit: ${spielstand.charakter.persönlichkeit}
- Schwierigkeitsgrad: ${spielstand.schwierigkeit}
- Bisherige Hinweise: ${spielstand.hinweise.join(', ') || 'keine'}
- Bisherige Gegenstände: ${spielstand.gegenstände.join(', ') || 'keine'}

WICHTIGE REGELN:
1. Der Spieler hat KEINE Kampferfahrung und ist verletzlich.
2. Du würfelst im Hintergrund mit einem W100 (1-100) und entscheidest basierend auf dem Ergebnis:
   - 1-30: Kritischer Misserfolg (etwas geht SCHWER schief)
   - 31-60: Misserfolg (Aktion schlägt fehl, aber nichts Schlimmes)
   - 61-85: Teilerfolg (Aktion gelingt teilweise)
   - 86-100: Großer Erfolg (Aktion gelingt perfekt!)
3. Bei lebensgefährlichen Aktionen würfelst du separat eine Überlebenschance.

Der Spieler möchte folgende Aktion ausführen: "${aktion}"

Beschreibe lebendig und atmosphärisch, was passiert. Baue das Würfelergebnis in deine Beschreibung ein, ohne die Zahl direkt zu nennen. Passe die Schwierigkeit an den gewählten Modus an (${spielstand.schwierigkeit}).

Deine Antwort sollte:
- 2-4 Sätze lang sein
- Die Konsequenz der Aktion zeigen
- Dem Spieler einen klaren nächsten Schritt ermöglichen
`;

        // KI-Anfrage an Cloudflare senden
        const response = await cloudflare.chat.completions.create({
            model: MODELL,
            messages: [
                { role: 'system', content: 'Du bist ein kreativer Spielleiter für Textadventures. Antworte auf Deutsch.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8, // Kreativität (0.0 = streng, 1.0 = kreativ)
            max_tokens: 500
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error(chalk.red('❌ Fehler bei der KI-Anfrage:'), error.message);
        
        // Fallback-Antworten, falls die KI nicht erreichbar ist
        const fallbackAntworten = [
            "Du zögerst einen Moment. Die Situation ist unklar.",
            "Nichts passiert. Vielleicht war das nicht der richtige Weg.",
            "Du wartest, aber es tut sich nichts.",
            "Deine Gedanken kreisen, aber du findest keinen klaren Ansatz."
        ];
        return fallbackAntworten[Math.floor(Math.random() * fallbackAntworten.length)];
    }
}

// --- Charaktererstellung ---
function waehleSchwierigkeit() {
    console.log(chalk.cyan('\n--- SCHRITT 1: WÄHLE DEINEN SCHWIERIGKEITSGRAD ---'));
    console.log('1: Story-Modus (Fokus auf Handlung, höhere Erfolgschancen)');
    console.log('2: Normal (Die Standard-Erfahrung)');
    console.log('3: Schwer (Reduzierte Chancen, gefährlicher)');
    console.log('4: Albtraum (Nur für Erfahrene)');
    
    const wahl = readline.questionInt(chalk.yellow('Deine Wahl (1-4): '), { limit: [1, 2, 3, 4] });
    
    switch(wahl) {
        case 1: spielstand.schwierigkeit = 'Story-Modus'; break;
        case 2: spielstand.schwierigkeit = 'Normal'; break;
        case 3: spielstand.schwierigkeit = 'Schwer'; break;
        case 4: spielstand.schwierigkeit = 'Albtraum'; break;
    }
    console.log(chalk.green(`✅ Schwierigkeitsgrad '${spielstand.schwierigkeit}' gewählt.\n`));
}

function waehleGeschichte() {
    console.log(chalk.cyan('--- SCHRITT 2: WÄHLE DEINE GESCHICHTE ---'));
    console.log('1: Entführt – Die Suche nach meinen Eltern (Gegenwart, real)');
    console.log('2: Das verfluchte Anwesen (1920er, Horror)');
    console.log('3: Die letzte Kolonie – Signalverlust (Ferne Zukunft, Sci-Fi)');
    
    const wahl = readline.questionInt(chalk.yellow('Deine Wahl (1-3): '), { limit: [1, 2, 3] });
    
    switch(wahl) {
        case 1: spielstand.geschichte = 'Entführt – Die Suche nach meinen Eltern'; break;
        case 2: spielstand.geschichte = 'Das verfluchte Anwesen'; break;
        case 3: spielstand.geschichte = 'Die letzte Kolonie – Signalverlust'; break;
    }
    console.log(chalk.green(`✅ Geschichte '${spielstand.geschichte}' gewählt.\n`));
}

function erstelleCharakter() {
    console.log(chalk.cyan('--- SCHRITT 3: ERSCHAFFE DEINEN CHARAKTER ---'));
    
    spielstand.charakter.name = readline.question(chalk.yellow('Vorname: '));
    spielstand.charakter.alter = readline.questionInt(chalk.yellow('Alter (12-25): '), { 
        limit: (input) => input >= 12 && input <= 25 
    });
    spielstand.charakter.persönlichkeit = readline.question(chalk.yellow('Kurze Persönlichkeitsbeschreibung: '));
    
    console.log(chalk.cyan('\n--- WÄHLE EINE SPEZIALFÄHIGKEIT ---'));
    console.log('1: Realistisch (90% Chance) – Schlossknacken, Erste Hilfe');
    console.log('2: Fortgeschritten (50% Chance) – Profi-Einbrecher, Meister der Tarnung');
    console.log('3: Sehr selten (10% Chance) – Gedankenlesen, 5 Min. Unsichtbarkeit');
    console.log('4: Unmöglich (0,1% Chance) – Fliegen, Teleportation');
    
    const faehigkeitsWunsch = readline.question(chalk.yellow('Was ist deine Wunschfähigkeit? '));
    const seltenheit = readline.questionInt(chalk.yellow('Wie selten? (1-4): '), { limit: [1, 2, 3, 4] });
    
    let erfolg = false;
    let wuerfelErgebnis;
    
    switch(seltenheit) {
        case 1: wuerfelErgebnis = wuerfeln(100); erfolg = wuerfelErgebnis <= 90; break;
        case 2: wuerfelErgebnis = wuerfeln(100); erfolg = wuerfelErgebnis <= 50; break;
        case 3: wuerfelErgebnis = wuerfeln(100); erfolg = wuerfelErgebnis <= 10; break;
        case 4: wuerfelErgebnis = wuerfeln(1000); erfolg = wuerfelErgebnis <= 1; break;
    }
    
    console.log(chalk.gray(`(Würfelergebnis: ${wuerfelErgebnis})`));
    
    if (erfolg) {
        spielstand.charakter.spezialfähigkeit.erhalten = true;
        spielstand.charakter.spezialfähigkeit.name = faehigkeitsWunsch;
        console.log(chalk.green(`✨ Glückwunsch! Du hast die Fähigkeit '${faehigkeitsWunsch}' erhalten! ✨`));
    } else {
        console.log(chalk.red(`❌ Du hast die Fähigkeit '${faehigkeitsWunsch}' leider nicht erhalten.`));
    }
}

function spielStarten() {
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan.bold('ENTFÜHRT – DIE SUCHE NACH MEINEN ELTERN'));
    console.log(chalk.cyan('========================================\n'));
    
    console.log(chalk.green(`Willkommen, ${spielstand.charakter.name}!`));
    console.log(`Du bist ${spielstand.charakter.alter} Jahre alt und ${spielstand.charakter.persönlichkeit}.`);
    
    switch(spielstand.geschichte) {
        case 'Entführt – Die Suche nach meinen Eltern':
            console.log(chalk.yellow('\n--- GEGENWART, DEUTSCHE GROẞSTADT ---'));
            console.log('Du kommst nach Hause. Die Tür ist aufgebrochen. Alles durchwühlt.');
            console.log('Auf dem Tisch liegt ein Zettel:');
            console.log(chalk.red('"Deine Eltern sind jetzt bei uns. Finde sie – wenn du kannst."'));
            break;
        case 'Das verfluchte Anwesen':
            console.log(chalk.yellow('\n--- 1920ER JAHRE, ENGLISCHE KÜSTE ---'));
            console.log('Nebel kriecht vom Meer herauf. Blackwood Manor ist unheimlich still.');
            console.log('Deine Eltern sind verschwunden. Die Dorfbewohner flüstern von einem Fluch.');
            break;
        case 'Die letzte Kolonie – Signalverlust':
            console.log(chalk.yellow('\n--- FERNE ZUKUNFT, MOND EUROPA ---'));
            console.log('Die Forschungsstation ist still. Kein Kontakt zur Erde.');
            console.log('Deine Eltern sind weg. Die Luftschleuse steht offen.');
            console.log('Auf dem Monitor blinkt:');
            console.log(chalk.red('"Sie haben uns gefunden. Versteck dich."'));
            break;
    }
    console.log(chalk.gray('\n📝 Tipp: "inventar", "ende" oder einfach beschreiben, was du tun willst'));
}

// --- Hauptschleife MIT Cloudflare AI ---
async function hauptschleife() {
    console.log(chalk.green('\n🎲 Cloudflare AI ist bereit, dein Spielleiter zu sein. Schreib, was du tun willst!\n'));
    
    while (true) {
        const aktion = readline.question(chalk.cyan('\n> Was tust du? '));
        
        if (aktion.toLowerCase() === 'ende' || aktion.toLowerCase() === 'beenden') {
            console.log(chalk.yellow('Spiel beendet.'));
            break;
        }
        
        if (aktion.toLowerCase() === 'inventar') {
            console.log(chalk.cyan('\n--- INVENTAR ---'));
            console.log('Hinweise:', spielstand.hinweise.length > 0 ? spielstand.hinweise.join(', ') : 'keine');
            console.log('Gegenstände:', spielstand.gegenstände.length > 0 ? spielstand.gegenstände.join(', ') : 'keine');
            
            if (spielstand.charakter.spezialfähigkeit.erhalten) {
                console.log(chalk.magenta(`Spezialfähigkeit: ${spielstand.charakter.spezialfähigkeit.name} (${spielstand.charakter.spezialfähigkeit.eingesetzt ? 'bereits eingesetzt' : 'noch verfügbar'})`));
            }
            continue;
        }
        
        // Zeige "Denkpunkt" während die KI arbeitet
        process.stdout.write(chalk.gray('🎲 Cloudflare denkt nach'));
        const interval = setInterval(() => process.stdout.write('.'), 500);
        
        try {
            // KI generiert Antwort
            const kiAntwort = await kiSpielleiter(aktion);
            
            clearInterval(interval);
            console.log('\n' + chalk.magenta('✨ ') + kiAntwort);
            
            // Speichere die Aktion im Spielverlauf
            spielstand.spielverlauf.push({ aktion, antwort: kiAntwort });
            if (spielstand.spielverlauf.length > 10) spielstand.spielverlauf.shift();
            
        } catch (error) {
            clearInterval(interval);
            console.log(chalk.red('\n❌ Ein Fehler ist aufgetreten. Bitte versuche es erneut.'));
        }
    }
}

// --- Hauptprogramm ---
async function main() {
    console.clear();
    console.log(chalk.cyan('╔════════════════════════════════════════╗'));
    console.log(chalk.cyan('║     ENTFÜHRT - DIE SUCHE NACH MEINEN   ║'));
    console.log(chalk.cyan('║                ELTERN                  ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════╝\n'));
    
    waehleSchwierigkeit();
    waehleGeschichte();
    erstelleCharakter();
    spielStarten();
    await hauptschleife();
}

// --- Alles starten ---
main().catch(error => {
    console.error(chalk.red('Ein schwerwiegender Fehler ist aufgetreten:'), error);
});