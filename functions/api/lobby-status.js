export async function onRequestGet(context) {
    const { env } = context;
    const { searchParams } = new URL(context.request.url);
    const type = searchParams.get('type');
    const track = await env.DB.prepare("SELECT * FROM tracks WHERE session_type = ? ORDER BY id DESC LIMIT 1").bind(type).first();
    let count = 0;
    if (track) {
        if (track.user_e) count++; if (track.user_s) count++;
        if (track.user_w) count++; if (track.user_n) count++;
    }
    return new Response(JSON.stringify({ count: count >= 4 ? 0 : count }));
}