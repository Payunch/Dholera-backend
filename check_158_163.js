const { Update } = require('./models');
async function checkPosts() {
  const p158 = await Update.findByPk(158);
  const p163 = await Update.findByPk(163);
  console.log("ID 158:", p158 ? p158.isPublished : 'not found', p158 ? p158.title : '');
  console.log("ID 163:", p163 ? p163.isPublished : 'not found', p163 ? p163.title : '');
  process.exit(0);
}
checkPosts();
