import { Redis } from "@upstash/redis";
import type { Digest } from "./types";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

// Só para desenvolvimento local, sem Redis configurado.
const mem = new Map<string, Digest>();

export const storageMode = redis ? "redis" : "memória (não persiste)";

export async function saveDigest(d: Digest): Promise<void> {
  if (!redis) {
    mem.set(d.date, d);
    return;
  }
  await redis.set(`digest:${d.date}`, d);
  await redis.zadd("digest:dates", { score: Date.parse(d.date), member: d.date });
}

export async function getDigest(date: string): Promise<Digest | null> {
  if (!redis) return mem.get(date) ?? null;
  return (await redis.get<Digest>(`digest:${date}`)) ?? null;
}

export async function listDates(limit = 14): Promise<string[]> {
  if (!redis) return [...mem.keys()].sort().reverse().slice(0, limit);
  return (await redis.zrange<string[]>("digest:dates", 0, limit - 1, { rev: true })) ?? [];
}
