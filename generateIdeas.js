export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { niche, platform } = req.body;

        if (!niche || niche.trim().length < 2) {
            return res.status(400).json({ 
                message: 'Please enter a valid niche.' 
            });
        }

        if (!platform) {
            return res.status(400).json({ 
                message: 'Platform required' 
            });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('ANTHROPIC_API_KEY not configured');
            return res.status(500).json({ 
                message: 'Server error: API not configured' 
            });
        }

        let prompt = buildPrompt(niche, platform);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Claude API error:', error);
            return res.status(response.status).json({ 
                message: 'Error calling AI API' 
            });
        }

        const data = await response.json();
        const generatedText = data.content[0].text;

        const ideas = extractIdeas(generatedText);

        return res.status(200).json({ 
            ideas: ideas,
            count: ideas.length
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            message: 'Server error: ' + error.message 
        });
    }
}

function buildPrompt(niche, platform) {
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const prompts = {
        tiktok: `You are a TikTok content strategist expert who stays updated with current trends.\n\nTODAY'S DATE: ${today}\nCreator's niche: "${niche}"\nPlatform: TikTok (15-60 second videos)\n\nIMPORTANT: Consider current trending topics, viral challenges, and what's popular RIGHT NOW in ${niche} and on TikTok.\n\nGenerate 10 unique video ideas that:\n- Capitalize on current trends and viral moments\n- Are specific to the "${niche}" niche\n- Are TikTok-native (short-form, entertaining, shareable)\n- Have high viral potential\n- Are actionable and specific\n\nFormat: number them 1. 2. 3. etc.\n\nReply ONLY with the 10 numbered ideas, nothing else.`,
        youtube: `You are a YouTube content strategist expert who stays updated with current trends.\n\nTODAY'S DATE: ${today}\nCreator's niche: "${niche}"\nPlatform: YouTube (5-20 minute videos)\n\nIMPORTANT: Consider current trending topics and what's generating buzz in ${niche} RIGHT NOW.\n\nGenerate 10 engaging video ideas that:\n- Tap into current trends and viral topics\n- Are relevant to the "${niche}" niche\n- Provide value, entertainment, or education\n- Have strong viewer retention potential\n- Address what people are searching for NOW\n\nFormat: number them 1. 2. 3. etc.\n\nReply ONLY with the 10 numbered ideas, nothing else.`,
        instagram: `You are an Instagram content strategist expert who stays updated with current trends.\n\nTODAY'S DATE: ${today}\nCreator's niche: "${niche}"\nPlatform: Instagram (Posts & Reels)\n\nIMPORTANT: Consider current Instagram trends, audio trends, and viral moments in ${niche}.\n\nGenerate 10 engaging content ideas that:\n- Leverage current trending sounds and formats\n- Are visually compelling and shareable\n- Mix trending and educational content\n- Align with what's popular in ${niche} RIGHT NOW\n- Have caption hooks for engagement\n\nFormat: number them 1. 2. 3. etc.\n\nReply ONLY with the 10 numbered ideas, nothing else.`,
        twitch: `You are a Twitch streaming strategist expert who knows current gaming and streaming trends.\n\nTODAY'S DATE: ${today}\nCreator's niche: "${niche}"\nPlatform: Twitch (Live streaming)\n\nIMPORTANT: Consider current gaming trends, viral games, and what streamers in ${niche} are doing RIGHT NOW.\n\nGenerate 10 stream/content ideas that:\n- Tap into current gaming and streaming trends\n- Are engagement-focused for live chat\n- Have interactive elements\n- Align with what's trending in ${niche} NOW\n- Are specific and actionable for streaming\n\nFormat: number them 1. 2. 3. etc.\n\nReply ONLY with the 10 numbered ideas, nothing else.`
    };

    return prompts[platform] || prompts.tiktok;
}

function extractIdeas(text) {
    const regex = /^\d+\.\s+(.+?)$/gm;
    const ideas = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        const cleanIdea = match[1].trim();
        if (cleanIdea) {
            ideas.push(cleanIdea);
        }
    }

    if (ideas.length === 0) {
        return text
            .split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 10);
    }

    return ideas.slice(0, 10);
}
