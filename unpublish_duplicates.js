const { Update } = require('./models');
const { Op } = require('sequelize');

async function unpublishDuplicates() {
  const duplicateSlugs = [
    'ahmedabad-metro-phase-3-cleared-boost-dholera-airport-link',
    'ahmedabad-metro-phase-3-gets-pib-clearance',
    'western-railway-floats-18901-crore-tender-sarkhej-dholera-semi-high-speed-rail-corridor',
    'aaiji-group-plans-135-million-sq-ft-development-dholera-sir',
    'ahmedabad-metro-phase-3-cleared-a-major-boost-for-dholera-airport-link',
    'ahmedabad-metro-phase-3-gets-pib-clearance-dholera-airport-link-moves-closer',
    'western-railway-floats-18901-crore-tender-for-dholera-smart-city',
    'western-railway-has-floated-a-massive-1890168-crore'
  ];

  await Update.update(
    { published: false, isApproved: false },
    { where: { slug: { [Op.in]: duplicateSlugs } } }
  );
  console.log('Duplicate slugs set to unpublished.');
  process.exit(0);
}
unpublishDuplicates();
