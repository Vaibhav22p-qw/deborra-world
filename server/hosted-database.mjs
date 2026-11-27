import { createClient } from '@libsql/client/web';
import { schema } from './database.mjs';

export async function openHostedDatabase(url, authToken) {
  const address = new URL(url);
  if (!['libsql:', 'https:'].includes(address.protocol) || address.username || address.password || !authToken) {
    throw new Error('Set a TLS Turso database URL and a server-only database token.');
  }
  const client = createClient({ url: address.href, authToken });
  try {
    await client.executeMultiple(schema);
  } catch (error) {
    client.close();
    throw error;
  }

  return {
    remote: true,
    prepare(sql) {
      const execute = (...args) => client.execute({ sql, args });
      return {
        async get(...args) { return (await execute(...args)).rows[0]; },
        async all(...args) { return (await execute(...args)).rows; },
        async run(...args) { return { changes: (await execute(...args)).rowsAffected }; }
      };
    },
    close() { client.close(); }
  };
}
