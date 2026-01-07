export async function onRequestGet(context) {
    const { env } = context;
    const { searchParams } = new URL(context.request.url);
    const type = searchParams.get('type');

    try {
        const track = await env.DB.prepare(
            "SELECT * FROM tracks WHERE session_type = ? AND status = 'ACTIVE' AND (user_e IS NULL OR user_s IS NULL OR user_w IS NULL OR user_n IS NULL) ORDER BY id DESC LIMIT 1"
        ).bind(type).first();

        let count = 0;
        if (track) {
            if (track.user_e) count++;
            if (track.user_s) count++;
            if (track.user_w) count++;
            if (track.user_n) count++;
        }
        return new Response(JSON.stringify({ count: count }));
    } catch (e) {
        return new Response(JSON.stringify({ count: 0, error: e.message }));
    }
}