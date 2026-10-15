import * as SQLite from 'expo-sqlite';
import { DB_NAME } from '../constants';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(SCHEMA_SQL);
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM schema_meta WHERE key = ?',
    ['schema_version'],
  );
  if (!row) {
    await db.runAsync(
      'INSERT INTO schema_meta (key, value) VALUES (?, ?)',
      ['schema_version', String(SCHEMA_VERSION)],
    );
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function clearAllData(): Promise<void> {
  const database = await getDatabase();
  const tables = [
    'history',
    'downloads',
    'playlist_tracks',
    'playlists',
    'tracks',
    'albums',
    'artists',
    'queue_state',
  ];
  await database.withTransactionAsync(async () => {
    for (const table of tables) {
      await database.runAsync(`DELETE FROM ${table}`);
    }
  });
}
