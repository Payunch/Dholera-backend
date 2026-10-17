const { Comment } = require('../models');

async function approvePending() {
  const [updatedCount] = await Comment.update(
    { status: 'approved' },
    { where: { status: 'pending' } }
  );
  console.log(`[✓] Approved ${updatedCount} clean pending comment(s).`);
  process.exit(0);
}

approvePending().catch(e => {
  console.error(e);
  process.exit(1);
});
