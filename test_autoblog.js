require('dotenv').config();
const sequelize = require('./config/database');
const { runDaily } = require('./services/autoBlogService');

async function test() {
  await sequelize.sync();
  console.log('Testing AutoBlogService LLM Payload Generation...');
  try {
    // Ignore the 36-hour gap to force a test run right now
    const result = await runDaily({ ignoreGap: true, contentMode: 'web' });
    if (result) {
      console.log('--- TEST SUCCESS ---');
      console.log('New Update Created (Draft Mode):', result.id);
      console.log('Title (EN):', result.title);
      console.log('Title (GU):', result.title_gu);
      console.log('Title (HI):', result.title_hi);
      console.log('Content (EN) Length:', result.content?.length);
      console.log('Content (GU) Length:', result.content_gu?.length);
      console.log('Content (HI) Length:', result.content_hi?.length);
    } else {
      console.log('--- TEST FAILED OR NO NEWS ---');
      console.log('Result was null. Check the logs above for rejected news or errors.');
    }
  } catch (error) {
    console.error('Test execution error:', error);
  }
  process.exit();
}

test();
