import { InMemoryRunner } from '@google/adk';
import { agent } from './agent.js';

async function main() {
  const runner = new InMemoryRunner({ agent });
  const response = await runner.run('hellow');
  
  // Make sure to explicitly print the response text
  console.log('Agent:', response.text);
}

main();

// Add export before const agent
export const agent = new LlmAgent({
  name: 'weather_assistant',
  model: 'gemini-2.5-flash',
  instructions: 'You are a helpful assistant.',
});