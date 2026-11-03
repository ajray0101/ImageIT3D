// Server entry point: `npm start`
import { config } from "./config.js";
import { createApp } from "./app.js";

createApp().listen(config.port, () => {
  console.log(`ImageIT3D running at http://localhost:${config.port}`);
  if (!config.meshyKey) console.warn("MESHY_API_KEY is not set: the Generate with Meshy panel stays hidden.");
  if (!config.anthropicKey) console.warn("ANTHROPIC_API_KEY is not set: the chat uses the built-in designer.");
});
