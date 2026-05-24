export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Setup CORS headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        // Handle OPTIONS request for CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // POST /submit-score
        if (request.method === "POST" && url.pathname === "/submit-score") {
            try {
                const data = await request.json();
                
                // Validate inputs
                if (!data.player_name || typeof data.remaining_money !== 'number' || 
                    typeof data.dice_count !== 'number' || typeof data.score !== 'number') {
                    return new Response(JSON.stringify({ error: "Invalid data" }), { 
                        status: 400,
                        headers: { "Content-Type": "application/json", ...corsHeaders } 
                    });
                }

                // Insert into D1
                const stmt = env.DB.prepare(
                    `INSERT INTO leaderboard (player_name, remaining_money, dice_count, score) VALUES (?, ?, ?, ?)`
                ).bind(data.player_name, data.remaining_money, data.dice_count, data.score);
                
                const result = await stmt.run();
                
                if (result.success) {
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { "Content-Type": "application/json", ...corsHeaders }
                    });
                } else {
                    return new Response(JSON.stringify({ error: "DB insertion failed" }), { 
                        status: 500,
                        headers: { "Content-Type": "application/json", ...corsHeaders } 
                    });
                }
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { 
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders } 
                });
            }
        }

        // GET /leaderboard
        if (request.method === "GET" && url.pathname === "/leaderboard") {
            try {
                // Get top 10 scores
                const stmt = env.DB.prepare(
                    `SELECT player_name, remaining_money, dice_count, score, created_at 
                     FROM leaderboard 
                     ORDER BY score DESC, created_at ASC 
                     LIMIT 10`
                );
                
                const { results } = await stmt.all();
                
                return new Response(JSON.stringify({ success: true, data: results }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { 
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders } 
                });
            }
        }

        // Default 404
        return new Response("Not found", { status: 404, headers: corsHeaders });
    }
};
