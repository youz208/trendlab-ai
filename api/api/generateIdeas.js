import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    // 1. Autoriser les requêtes depuis ton site
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Gérer la requête de vérification OPTIONS de Vercel
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Vérifier que c'est bien une requête POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
    }

    try {
        const { niche, platform } = req.body;

        // Validation rapide des données reçues
        if (!niche) {
            return res.status(400).json({ message: 'La niche est requise.' });
        }

        const chosenPlatform = platform || 'TikTok';

        // 3. Initialiser l'API Gemini avec ta clé secrète stockée sur Vercel
        // (Assure-toi d'avoir configuré GEMINI_API_KEY dans les paramètres Vercel)
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Construit un prompt efficace pour l'IA
        const prompt = `Tu es un expert en croissance sur les réseaux sociaux et un stratège de contenu viral. 
Génère exactement 5 idées de vidéos uniques, ultra-captivantes et tendances pour la niche suivante : "${niche}".
Ces idées doivent être spécifiquement optimisées pour le format de la plateforme : ${chosenPlatform}.

Donne ta réponse STRICTEMENT sous la forme d'un tableau JSON valide contenant uniquement des chaînes de caractères, sans explications, sans introduction, et sans blocs de code markdown. 
Exemple de format attendu :
["Idée 1", "Idée 2", "Idée 3", "Idée 4", "Idée 5"]`;

        // 4. Appeler le modèle Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const responseText = response.text.trim();
        
        // 5. Nettoyer et analyser la réponse JSON reçue
        let ideas;
        try {
            // Nettoyage au cas où le modèle inclut des balises markdown ```json
            const cleanJson = responseText.replace(/```json|```/g, '').trim();
            ideas = JSON.parse(cleanJson);
        } catch (jsonError) {
            console.error("Erreur de parsing JSON de la réponse de l'IA:", responseText);
            // Solution de secours si l'IA renvoie du texte brut au lieu d'un JSON propre
            ideas = responseText.split('\n').filter(line => line.trim() !== '').slice(0, 5);
        }

        // 6. Renvoyer les idées au format JSON vers ton fichier index.html
        return res.status(200).json({ ideas: ideas });

    } catch (error) {
        console.error('Erreur API Gemini:', error);
        return res.status(500).json({ 
            message: "Une erreur est survenue lors de la génération des idées.", 
            error: error.message 
        });
    }
}
