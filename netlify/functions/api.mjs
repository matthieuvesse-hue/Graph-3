// API Graphiques CA : graphiques, dossiers et modèles stockés dans Netlify Blobs.
// Routes : GET /api/all, PUT et DELETE /api/{charts|folders|templates}/{id}
import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';

const KINDS = ['charts', 'folders', 'templates'];
const TYPES = new Set(['evo', 'grp', 'pont', 'line', 'combo']);
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BODY = 256 * 1024;

const store = () => getStore({ name: 'graphiques-ca', consistency: 'strong' });

const json = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function authorized(req) {
  const expected = Buffer.from(process.env.ACCESS_TOKEN || '');
  const got = Buffer.from(req.headers.get('x-access-token') || '');
  return expected.length > 0 && got.length === expected.length && timingSafeEqual(got, expected);
}

const ts = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : Date.now());
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const optId = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : null);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Ne garde que les champs attendus par l’application, avec des valeurs saines.
function clean(kind, id, b) {
  if (kind === 'folders') {
    const parentId = optId(b.parentId);
    if (parentId === id) return { error: 'Un dossier ne peut pas être son propre parent' };
    return { item: { id, name: str(b.name, 120) || 'Nouveau dossier', parentId, createdAt: ts(b.createdAt), updatedAt: ts(b.updatedAt) } };
  }
  if (!TYPES.has(b.type) || !isObj(b.block)) return { error: kind === 'charts' ? 'Graphique invalide' : 'Modèle invalide' };
  const base = { id, type: b.type, block: b.block, common: isObj(b.common) ? b.common : {}, createdAt: ts(b.createdAt), updatedAt: ts(b.updatedAt) };
  if (kind === 'templates') return { item: { ...base, name: str(b.name) || 'Modèle sans nom' } };
  return { item: { ...base, name: str(b.name) || 'Graphique sans titre', customName: !!b.customName, folderId: optId(b.folderId) } };
}

// Lit tous les éléments d’un type, avec au plus 16 lectures simultanées.
async function readAll(s, kind) {
  const { blobs } = await s.list({ prefix: kind + '/' });
  const out = [];
  for (let i = 0; i < blobs.length; i += 16) {
    const part = await Promise.all(blobs.slice(i, i + 16).map((b) => s.get(b.key, { type: 'json' })));
    part.forEach((v) => { if (isObj(v)) out.push(v); });
  }
  return out;
}

export default async (req) => {
  if (!process.env.ACCESS_TOKEN) return json(503, { error: 'ACCESS_TOKEN non configuré sur Netlify' });
  if (!authorized(req)) return json(401, { error: 'Code d’accès invalide' });

  let parts;
  try { parts = new URL(req.url).pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return json(400, { error: 'Adresse invalide' }); }
  const isAll = parts.length === 1 && parts[0] === 'all';
  const [kind, id] = parts;
  if (!isAll && (parts.length !== 2 || !KINDS.includes(kind) || !ID_RE.test(id || ''))) return json(404, { error: 'Route inconnue' });
  if (isAll ? req.method !== 'GET' : !['PUT', 'DELETE'].includes(req.method)) return json(405, { error: 'Méthode non autorisée' });

  try {
    const s = store();
    if (isAll) {
      const [charts, folders, templates] = await Promise.all(KINDS.map((k) => readAll(s, k)));
      charts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return json(200, { charts, folders, templates });
    }
    if (req.method === 'DELETE') { await s.delete(kind + '/' + id); return json(200, { ok: true }); }
    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { error: 'Document trop volumineux' });
    let body; try { body = JSON.parse(text); } catch { return json(400, { error: 'JSON invalide' }); }
    if (!isObj(body)) return json(400, { error: 'JSON invalide' });
    const { item, error } = clean(kind, id, body);
    if (error) return json(400, { error });
    await s.setJSON(kind + '/' + id, item);
    return json(200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Erreur de stockage Netlify Blobs' });
  }
};

export const config = { path: '/api/*' };
