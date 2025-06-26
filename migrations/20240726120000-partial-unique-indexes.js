const partialFilterExpression = { archivedAt: { $eq: null } };

export async function up(db) {
  console.log('Applying partial unique indexes...');

  // --- MapTemplate ---
  await db.collection('maptemplates').createIndex({ name: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_name' });
  await db.collection('maptemplates').createIndex({ slug: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_slug' });

  // --- TournamentTemplate ---
  await db.collection('tournamenttemplates').createIndex({ name: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_name' });
  await db.collection('tournamenttemplates').createIndex({ slug: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_slug' });

  // --- Family ---
  await db.collection('families').createIndex({ name: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_name' });
  await db.collection('families').createIndex({ slug: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_slug' });

  // --- Tournament ---
  await db.collection('tournaments').createIndex({ slug: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_slug' });

  // --- Player ---
  await db.collection('players').createIndex({ slug: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_slug' });
  await db.collection('players').createIndex({ firstName: 1, lastName: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_fullname' });

  // --- Map ---
  await db.collection('maps').createIndex({ tournament: 1, slug: 1 }, { unique: true, partialFilterExpression, name: 'active_unique_tournament_slug' });

  console.log('Successfully applied partial unique indexes.');
}
export async function down(db) {
  console.log('Reverting partial unique indexes...');

  // --- MapTemplate ---
  await db.collection('maptemplates').dropIndex('active_unique_name');
  await db.collection('maptemplates').dropIndex('active_unique_slug');

  // --- TournamentTemplate ---
  await db.collection('tournamenttemplates').dropIndex('active_unique_name');
  await db.collection('tournamenttemplates').dropIndex('active_unique_slug');

  // --- Family ---
  await db.collection('families').dropIndex('active_unique_name');
  await db.collection('families').dropIndex('active_unique_slug');

  // --- Tournament ---
  await db.collection('tournaments').dropIndex('active_unique_slug');

  // --- Player ---
  await db.collection('players').dropIndex('active_unique_slug');
  await db.collection('players').dropIndex('active_unique_fullname');

  // --- Map ---
  await db.collection('maps').dropIndex('active_unique_tournament_slug');

  console.log('Successfully reverted partial unique indexes.');
} 